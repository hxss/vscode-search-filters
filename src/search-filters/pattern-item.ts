import * as vscode from 'vscode';
import type { PatternList } from './pattern-list';

/** Tree leaf: a single glob pattern with a checkbox. */
export class PatternItem extends vscode.TreeItem {
	readonly contextValue = 'pattern';

	constructor(
		readonly list: PatternList,
		readonly pattern: string,
		readonly enabled: boolean,
	) {
		super(pattern, vscode.TreeItemCollapsibleState.None);
		this.checkboxState = enabled
			? vscode.TreeItemCheckboxState.Checked
			: vscode.TreeItemCheckboxState.Unchecked;
	}

	getChildren(): PatternItem[] {
		return [];
	}
}
