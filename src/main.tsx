import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import {plugins} from "./editor/plugins"

import {
  createSignal, createState, createEffect,
  useContext, untrack, onMount,
} from "solid-js";
import { render, For } from "solid-js/web";

import { Children, EditorMode } from './types'
import {
  Route, urlOfRoute,
  NewNote, EditNote,
  Router, RoutingContext,
} from './router'

import './styles.css';

type NoteInfo = { title: string }

const Notes = () => {
  const notes = new Map<string,EditorState>();
  const [noteList, setNoteList] = createSignal(new Set<string>());
  const [noteInfo, setNoteInfo] = createState({} as Record<string,NoteInfo>);
  const { route, goTo } = useContext(Router);

  let activeNoteID: string | null = null;
  let prevID = "";
  function nextNoteID() { prevID += "a"; return prevID; }

  // Initialize the ProseMirror editor in the given DOM node.
  function initializeEditorView(editorElement: Node) {
    let state = createEditorState();
    let view = new EditorView(editorElement, { state, dispatchTransaction: (transaction) => {
      let newState = view.state.apply(transaction);
      view.updateState(newState);
      if (!activeNoteID) {
        // We don't bother giving this note an ID until the user actually types
        // something.
        let id = nextNoteID();
        activeNoteID = id;
        setNoteInfo(activeNoteID, {title: "Untitled"});
        // We call `untrack` because this will ultimately be called in a tracked
        // context and we don't want recursive updates.
        setNoteList(untrack(() => noteList().add(id)));
        // Navigate to the URL for the newly allocated note ID. Since
        // `activeNoteID` is already set to the same ID, the editor state is
        // preserved.
        goTo(EditNote(id));
      }
    } });
    return view;
  }
  function createEditorState(): EditorState {
    const editorStateConfig = { schema, plugins: plugins({ schema }) };
    return EditorState.create(editorStateConfig);
  }

  // @ts-ignore: See above.
  let editorNode: HTMLElement = undefined;
  let editorView: EditorView;
  onMount(() => { editorView = initializeEditorView(editorNode) });

  createEffect(() => {
    let editorMode = route.editorMode;
    if (editorMode.mode === EditorMode.New) {
      if (activeNoteID) { // We were already editing a note
        // Save the note we were just editing.
        notes.set(activeNoteID, editorView.state);
        // Don't have a note ID yet. We create it when the user types something.
        activeNoteID = null;
        // Blank out the editor.
        editorView.updateState(createEditorState());
      }
      document.title = "New note";
      editorView.focus();
    } else if (editorMode.mode === EditorMode.Edit) {
      let noteID = editorMode.noteID;
      if (noteID !== activeNoteID) {
        // We are editing a particular note – not the one we were already editing,
        // if any. (If it was the one we were already editing, there is no need to
        // do anything.)
        // If we were already editing a note, save it.
        if (activeNoteID) notes.set(activeNoteID, editorView.state);
        activeNoteID = noteID;
        let noteState = notes.get(noteID);
        // If we know of this note, show it; if not, create a fresh note.
        noteState ? editorView.updateState(noteState) : editorView.updateState(createEditorState());
      }
    } else if (editorMode.mode === EditorMode.Disabled) { // Otherwise, we are already editing the requested note; do nothing.
      // We are not editing any note.
      if (activeNoteID) {
        // We were just now, though. Make sure to
        // save its contents.
        notes.set(activeNoteID, editorView.state);
        // No longer editing.
        activeNoteID = null;
      }
      // Blank out the editor and hide it.
      editorView.updateState(createEditorState());
    }
  });

  return <>
      <header>
        <h1 class="font-bold">Notes</h1>
      </header>
      <section class="flex mt-4">
        <nav class="flex-initial w-52">
          <button
            class="rounded-lg bg-indigo-600 active:bg-indigo-700 text-gray-50 px-2 py-1 -ml-2 -mt-1"
            onClick={(_ev) => goTo(NewNote)}>New note</button>
        <ul class="mt-4 space-y-2" aria-label="Notes">
          <For each={Array.from(noteList())}>
            {id => <li><Link to={EditNote(id)}>{noteInfo[id].title}</Link></li>}
          </For>
      </ul></nav>
      <main class="flex-auto w-96 ml-4">
        <article
          class="prose"
          style={{ display: route.editorMode.mode === EditorMode.Disabled ? 'none' : 'block' }}
          ref={editorNode}>
        </article>
      </main>
      </section>
    </>;
};

const App = () => {
  return <RoutingContext>
    <div class="my-4 mx-4 sm:mx-6 md:mx-8">
      <Notes/>
    </div>
  </RoutingContext>

}

const Link = (props: { to: Route, children: Children, cssClass?: string }) => {
  const router = useContext(Router);
  const url = urlOfRoute(props.to);
  const handleClick = (event: Event) => {
    event.preventDefault();
    router.goTo(props.to);
  }
  return <a href={url} class={props.cssClass ?? ""} onClick={handleClick}>{props.children}</a>
}

render(() => <App/>, document.body);
