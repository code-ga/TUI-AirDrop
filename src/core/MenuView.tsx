import { BaseView } from "./BaseView";

export interface MenuItem {
  label: string;
  value: any;
}

export abstract class MenuView<P = {}, S = {}> extends BaseView<P, S> {
  protected abstract getMenuItems(): MenuItem[];
  protected abstract handleSelect(item: MenuItem): void;
}
