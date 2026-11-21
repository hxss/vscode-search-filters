import * as vscode from 'vscode';
import { FiltersConfig, ListKey, Patterns } from './filters-config';
import { PatternItem } from './pattern-item';

/** Tree group: "Files to include" / "Files to exclude", backed by `searchFilters.<key>`. */
export class PatternList extends vscode.TreeItem {
	readonly contextValue = 'group';

	constructor(
		private readonly config: FiltersConfig,
		readonly key: ListKey,
		readonly title: string,
	) {
		super(title, vscode.TreeItemCollapsibleState.Expanded);
	}

	private get patterns(): Patterns {
		return this.config.get(this.key);
	}

	getChildren(): PatternItem[] {
		return Object.entries(this.patterns)
			.map(([pattern, enabled]) => new PatternItem(this, pattern, enabled));
	}

	has(pattern: string): boolean {
		return Object.hasOwn(this.patterns, pattern);
	}

	/** Enabled patterns joined for the `filesToInclude` / `filesToExclude` search fields. */
	toGlob(): string {
		return Object.entries(this.patterns)
			.filter(([, enabled]) => enabled)
			.map(([pattern]) => pattern)
			.join(', ');
	}

	add(pattern: string): Thenable<void> {
		return this.save({ ...this.patterns, [pattern]: true });
	}

	/** Renames the pattern in place, keeping its position and checkbox state. */
	rename(item: PatternItem, to: string): Thenable<void> {
		const entries = Object.entries(this.patterns)
			.map(([pattern, enabled]) => [pattern === item.pattern ? to : pattern, enabled]);
		return this.save(Object.fromEntries(entries));
	}

	remove(item: PatternItem): Thenable<void> {
		const { [item.pattern]: _removed, ...rest } = this.patterns;
		return this.save(rest);
	}

	setEnabled(item: PatternItem, enabled: boolean): Thenable<void> {
		return this.save({ ...this.patterns, [item.pattern]: enabled });
	}

	private save(value: Patterns): Thenable<void> {
		return this.config.set(this.key, value);
	}
}
