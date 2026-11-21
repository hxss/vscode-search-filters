import * as vscode from 'vscode';
import { FiltersConfig } from './filters-config';
import { PatternItem } from './pattern-item';
import { PatternList } from './pattern-list';

type FilterNode = PatternList | PatternItem;

const VIEW_ID = 'search-filters.filters';
const SEARCH_CONTAINER_ID = 'workbench.view.search';
const MOVED_KEY = 'search-filters.movedToSearch';

export class SearchFilters implements vscode.TreeDataProvider<FilterNode> {
	private readonly config = new FiltersConfig();
	private readonly changed = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this.changed.event;

	private readonly include = new PatternList(this.config, 'include', 'Files to include');
	private readonly exclude = new PatternList(this.config, 'exclude', 'Files to exclude');

	constructor(private readonly context: vscode.ExtensionContext) {}

	register(): void {
		const view = vscode.window.createTreeView(VIEW_ID, {
			treeDataProvider: this,
			manageCheckboxStateManually: true,
		});

		this.context.subscriptions.push(
			this.config,
			this.changed,
			view,
			view.onDidChangeCheckboxState(e => this.onCheckboxChange(e)),
			this.config.onDidChange(() => {
				this.changed.fire();
				void this.applyFilters();
			}),
			vscode.commands.registerCommand('search-filters.addPattern', (list: PatternList) => this.addPattern(list)),
			vscode.commands.registerCommand('search-filters.editPattern', (item: PatternItem) => this.editPattern(item)),
			vscode.commands.registerCommand('search-filters.removePattern', (item: PatternItem) => item.list.remove(item)),
		);

		void this.moveToSearchPanel();
	}

	getTreeItem(node: FilterNode): vscode.TreeItem {
		return node;
	}

	getChildren(node?: FilterNode): FilterNode[] {
		return node ? node.getChildren() : [this.include, this.exclude];
	}

	private async addPattern(list: PatternList): Promise<void> {
		const pattern = await this.askPattern(list, `Add to "${list.title}"`);
		if (pattern) {
			await list.add(pattern);
		}
	}

	private async editPattern(item: PatternItem): Promise<void> {
		const pattern = await this.askPattern(item.list, `Edit in "${item.list.title}"`, item.pattern);
		if (pattern && pattern !== item.pattern) {
			await item.list.rename(item, pattern);
		}
	}

	private async askPattern(list: PatternList, title: string, current?: string): Promise<string | undefined> {
		const value = await vscode.window.showInputBox({
			title,
			value: current,
			placeHolder: '**/vendor/**',
			prompt: 'Glob pattern',
			validateInput: input => {
				const pattern = input.trim();
				if (!pattern) {
					return 'Pattern must not be empty';
				}
				if (pattern !== current && list.has(pattern)) {
					return 'Pattern already exists in this list';
				}
				return undefined;
			},
		});
		return value?.trim();
	}

	private async onCheckboxChange(e: vscode.TreeCheckboxChangeEvent<FilterNode>): Promise<void> {
		for (const [node, state] of e.items) {
			if (node instanceof PatternItem) {
				await node.list.setEnabled(node, state === vscode.TreeItemCheckboxState.Checked);
			}
		}
	}

	private applyFilters(): Thenable<unknown> {
		return vscode.commands.executeCommand('workbench.action.findInFiles', {
			filesToInclude: this.include.toGlob(),
			filesToExclude: this.exclude.toGlob(),
			showIncludesExcludes: true,
			triggerSearch: true,
		});
	}

	// Extensions can't contribute views to the Search container directly,
	// so the view is declared in Explorer and moved to Search once, on first activation.
	// After that VS Code remembers its location (the user can move it freely).
	private async moveToSearchPanel(): Promise<void> {
		if (this.context.globalState.get<boolean>(MOVED_KEY)) {
			return;
		}
		try {
			await vscode.commands.executeCommand('vscode.moveViews', {
				viewIds: [VIEW_ID],
				destinationId: SEARCH_CONTAINER_ID,
			});
			await this.context.globalState.update(MOVED_KEY, true);
		} catch (err) {
			console.error('search-filters: failed to move view to Search', err);
		}
	}
}
