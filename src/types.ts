import { JSX } from 'solid-js'

export type Children = JSX.Element | JSX.Element[]

export type NoteID = string;

// Which method of the HTML History API to use – either `history.pushState` or
// `history.replaceState`.
export const enum HistoryChangeMode { Push, Replace };
