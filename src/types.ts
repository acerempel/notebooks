import { JSX } from 'solid-js'

export type Children = JSX.Element | JSX.Element[]

export type NoteID = string;

export enum EditorMode {
  New = "new",
  Edit = "edit",
  Disabled = "off",
}

// Which method of the HTML History API to use – either `history.pushState` or
// `history.replaceState`.
export const enum HistoryChangeMode { Push, Replace };


export type NewEditorMode = { mode: EditorMode.New }
export type EditEditorMode = { mode: EditorMode.Edit, noteID: NoteID }
export type DisabledEditorMode = { mode: EditorMode.Disabled }
export type EditorModeRoute =
  | NewEditorMode
  | EditEditorMode
  | DisabledEditorMode
