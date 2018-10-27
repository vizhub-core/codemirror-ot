export type Path = (number | string)[];
export interface Op {
  p: Path
  si?: string; // string insert
  sd?: string; // string delete
}
