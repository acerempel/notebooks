import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import {plugins} from "./editor/plugins"

import { createClient, User } from '@supabase/supabase-js';

import {
  createSignal, createState, createEffect,
  createContext, useContext, untrack,
  JSX } from "solid-js";
import { render, Switch, Match, Dynamic, For } from "solid-js/web";

import { Children } from './types'
import {
  Route, urlOfRoute,
  Page, NewNote, EditNote,
  Router, RoutingContext,
} from './router'

import './styles.css';

function displayError(er: unknown) {
  console.error(er); // TODO show it in the DOM
}

const SUPABASE_URL = "https://qhqomieoafclafetsoxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwODgyMzk3MSwiZXhwIjoxOTI0Mzk5OTcxfQ.ZBHH8NRe8eMVj8xuNUHoLuroL--zvKVO6YYsPS2zJqQ";
const database = createClient(SUPABASE_URL, SUPABASE_KEY);

type UserMaybe = User | null;

const ActiveUser = createContext({
  user: () => null as UserMaybe,
  setUser: (_: UserMaybe) => null as UserMaybe
});

const UserContext = (props: { children: Children }) => {
  const [user, setUser] = createSignal(null as UserMaybe);
  return <ActiveUser.Provider value={{ user, setUser }}>{props.children}</ActiveUser.Provider>
}

const SignUp = () => {
  const { setUser } = useContext(ActiveUser);
  async function doSignUp(event: Event) {
    event.preventDefault();
    let { user, error } = await database.auth.signUp({ email: email.value, password: password.value });
    if (error) { displayError(error) }
    else { setUser(user); }
  }
  // @ts-ignore: These get assigned before use because of the `ref` thing.
  // TypeScript also complains if we declare without assigning here, and that
  // can't be turned off with ts-ignore inside JSX, apparently.
  let email: HTMLInputElement = undefined, password: HTMLInputElement = undefined;
  return <main>
    <h1>Create an account</h1>
    <form onSubmit={doSignUp}>
      <label>Email <input type="email" ref={email}/></label>
      <label>Password <input type="password" ref={password}/></label>
      <button type="submit">Sign up</button>
    </form>
  </main>;
};

type NoteInfo = { title: string }
const Notes = () => {
  const notes = new Map<string,EditorState>();
  const [noteList, setNoteList] = createSignal(new Set<string>());
  const [noteInfo, setNoteInfo] = createState({} as Record<string,NoteInfo>);
  const { user } = useContext(ActiveUser);
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
  createEffect(() => { editorView = initializeEditorView(editorNode) });

  createEffect(() => {
    let noteID = route.noteID;
    if (noteID === "new") { // Creating a new note
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
    } else if (noteID && noteID !== activeNoteID) {
      // We are editing a particular note – not the one we were already editing,
      // if any. (If it was the one we were already editing, there is no need to
      // do anything.)
      // If we were already editing a note, save it.
      if (activeNoteID) notes.set(activeNoteID, editorView.state);
      activeNoteID = noteID;
      let noteState = notes.get(noteID);
      // If we know of this note, show it; if not, create a fresh note.
      noteState ? editorView.updateState(noteState) : editorView.updateState(createEditorState());
    } // Otherwise, we are already editing the requested note; do nothing.
    else if (!noteID) {
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
      <header class="flex">
        <h1 class="font-bold">Notes</h1>
        <Switch>
          <Match when={user() !== null}>
              <strong class="ml-auto">{user()?.email}</strong>
              <a class="ml-4" href="#">Sign out</a>
          </Match>
          <Match when={user() === null}>
            <Link cssClass="ml-auto" to={{page: Page.SignUp}}>Create an account</Link>
            <Link cssClass="ml-4" to={{page: Page.SignIn}}>Sign in</Link>
          </Match>
        </Switch>
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
        <article class="prose" style={{ display: route.noteID ? 'block' : 'none' }} ref={editorNode}></article>
      </main>
      </section>
    </>;
};

const UnknownURL = () => {
  const { route } = useContext(Router);
  return <main>
    <h1>Page not found!</h1>
    <p>The url {urlOfRoute(route)} does not correspond to any page.</p>
  </main>
};

const App = () => {
  return <UserContext>
    <RoutingContext>
      <div class="my-4 mx-4 sm:mx-6 md:mx-8">
        <Main/>
      </div>
    </RoutingContext>
  </UserContext>
}

const Main = () => {
  const { route } = useContext(Router);

  createEffect((method) => {
    const newTitle = Pages[route.page].title;
    const newURL = urlOfRoute(route);
    method === History.Push
      ? history.pushState(null, newTitle, newURL)
      : history.replaceState(null, newTitle, newURL);
    document.title = newTitle;
    return History.Push;
  }, History.Replace);

  return <Dynamic component={Pages[route.page].component}/>
}

interface PageInfo { title: string, component: () => JSX.Element };

const Pages: Record<Page, PageInfo> = {
  notes: { title: "Notes", component: Notes },
  signup: { title: "Create an account", component: SignUp },
  signin: { title: "Sign in", component: () => <p>Oh no!</p> },
  '404': { title: "Page not found", component: UnknownURL }
}

// Which method of the HTML History API to use – either `history.pushState` or
// `history.replaceState`.
const enum History { Push, Replace };

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

async function fetchNote(noteId: string) {
  const { data, error } = await database.from('notes').select().eq('id', noteId);
  if (error) { console.error(error); }
  return data;
}
