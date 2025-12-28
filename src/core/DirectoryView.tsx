import { BaseView } from "./BaseView";
import fs from "node:fs";
import path from "node:path";

export interface DirectoryState {
  currentDir: string;
}

export abstract class DirectoryView<P = {}, S extends DirectoryState = DirectoryState> extends BaseView<P, S> {
  constructor(props: P) {
    super(props);
    this.state = {
      currentDir: process.cwd(),
    } as S;
  }

  protected getDirectoryItems(showOnlyDirs: boolean = false) {
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

      let items = entries;
      if (showOnlyDirs) {
        items = entries.filter((item) => item.isDir);
      }

      return [{ label: ".. (Go Back)", value: "..", isDir: true }, ...items];
    } catch {
      return [{ label: "Error reading directory", value: "error", isDir: false }];
    }
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
