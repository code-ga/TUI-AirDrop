import { BaseView } from "./BaseView";
import fs from "node:fs";
import path from "node:path";

export interface DirectoryItem {
  label: string;
  value: string;
  isDir: boolean;
}

export interface DirectoryState {
  currentDir: string;
  items: DirectoryItem[];
}

export abstract class DirectoryView<P = {}, S extends DirectoryState = DirectoryState> extends BaseView<P, S> {
  constructor(props: P) {
    super(props);
    this.state = {
      currentDir: process.cwd(),
      items: [],
    } as unknown as S;
  }

  override componentDidMount() {
    this.refreshDirectoryItems();
  }

  override componentDidUpdate(_prevProps: P, prevState: S) {
    if (prevState.currentDir !== this.state.currentDir) {
      this.refreshDirectoryItems();
    }
  }

  protected refreshDirectoryItems() {
    const { currentDir } = this.state;
    try {
      const entries = fs.readdirSync(currentDir).map((name) => {
        try {
          const fullPath = path.join(currentDir, name);
          const isDir = fs.statSync(fullPath).isDirectory();
          return { label: `${name}${isDir ? "/" : ""}`, value: name, isDir };
        } catch {
          return {
            label: `${name} (access error)`,
            value: name,
            isDir: false,
          };
        }
      });

      // Sort: Directories first, then alphabetically
      entries.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.label.localeCompare(b.label);
      });

      const items = [{ label: `.. (Up one level)`, value: "..", isDir: true }, ...entries];
      this.setState({ items } as any);
    } catch (e) {
      this.setState({
        items: [{ label: "Error reading directory", value: "error", isDir: false }]
      } as any);
    }
  }

  protected getDirectoryItems(showOnlyDirs: boolean = false) {
    if (showOnlyDirs) {
      return this.state.items.filter((item) => item.isDir);
    }
    return this.state.items;
  }

  protected getFullPath(fileName: string) {
    return path.join(this.state.currentDir, fileName);
  }

  protected handleDirectorySelect(item: any, onFileSelect?: (path: string) => void) {
    const { currentDir } = this.state;
    if (item.value === "..") {
      const parent = path.dirname(currentDir);
      if (parent !== currentDir) {
        this.setState({ currentDir: parent } as any);
      }
    } else if (item.isDir) {
      this.setState({ currentDir: this.getFullPath(item.value) } as any);
    } else if (onFileSelect) {
      onFileSelect(this.getFullPath(item.value));
    }
  }
}
