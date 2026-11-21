import * as vscode from 'vscode';

export type ListKey = 'include' | 'exclude';
export type Patterns = Record<string, boolean>;

const SECTION = 'searchFilters';

/** Reads and writes the `searchFilters.*` settings. */
export class FiltersConfig implements vscode.Disposable {
	private readonly emitter = new vscode.EventEmitter<void>();

	/** Fires on any change of `searchFilters.*`: from the view or from a manual settings edit. */
	readonly onDidChange = this.emitter.event;

	private readonly subscription = vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(SECTION)) {
			this.emitter.fire();
		}
	});

	get(key: ListKey): Patterns {
		return vscode.workspace.getConfiguration(SECTION).get<Patterns>(key, {});
	}

	set(key: ListKey, value: Patterns): Thenable<void> {
		return vscode.workspace.getConfiguration(SECTION).update(key, value, this.target);
	}

	/** `*.code-workspace` or `.vscode/settings.json`; user settings when no folder is open. */
	private get target(): vscode.ConfigurationTarget {
		return vscode.workspace.workspaceFolders
			? vscode.ConfigurationTarget.Workspace
			: vscode.ConfigurationTarget.Global;
	}

	dispose(): void {
		this.subscription.dispose();
		this.emitter.dispose();
	}
}
