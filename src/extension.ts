import * as vscode from 'vscode';
import { SearchFilters } from './search-filters/search-filters';

export function activate(context: vscode.ExtensionContext) {
	new SearchFilters(context).register();
}
