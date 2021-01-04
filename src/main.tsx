import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import {plugins} from "./editor/plugins"

import { createClient, User } from '@supabase/supabase-js';

import { createSignal, createState, createEffect, createContext, useContext, JSX } from "solid-js";
import { render, Switch, Match } from "solid-js/web";

function displayError(er: unknown) {
  console.error(er); // TODO show it in the DOM
}

// Initialize the ProseMirror editor in the given DOM node.
function initializeEditorView(editorElement: Node) {
  const editorStateConfig = { schema, plugins: plugins({ schema }) };
  let state = EditorState.create(editorStateConfig);
  let view = new EditorView(editorElement, { state });
  return view;
}

const SUPABASE_URL = "https://qhqomieoafclafetsoxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwODgyMzk3MSwiZXhwIjoxOTI0Mzk5OTcxfQ.ZBHH8NRe8eMVj8xuNUHoLuroL--zvKVO6YYsPS2zJqQ";
const database = createClient(SUPABASE_URL, SUPABASE_KEY);

const defaultRoute: Route = { page: "notes", rest: [], title: "Notes" }
const Router = createContext({ route: defaultRoute, goTo(_: Route) {} });

const Routed = (props: { children: JSX.Element[] | JSX.Element }) => {
  const [route, setRoute]: [Route, (to: Route) => void] = createState(defaultRoute);
  window.onpopstate = (_event: Event) => interpretURL(setRoute);
  const router = { route, goTo: setRoute };
  return <Router.Provider value={router}>{props.children}</Router.Provider>
}

const Link = (props: { children: JSX.Element[] | JSX.Element, to: string, title: string | undefined }) => {
  let pathParts = props.to.split("/");
  let route = { page: pathParts[0], rest: pathParts.slice(1), title: props.title };
  const router = useContext(Router);
  const handleClick = (event: Event) => {
    event.preventDefault();
    history.pushState(null, props.title ?? "", "/" + props.to);
    router.goTo(route)
  }
  return <a href={props.to} onClick={handleClick}>{props.children}</a>
}

type UserMaybe = User | null;

const SignUp = ({ setUser }: { setUser: (newUser: UserMaybe) => void }) => {
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
      // @ts-ignore
      <label>Email <input type="email" ref={email}/></label>
      <label>Password <input type="password" ref={password}/></label>
      <button type="submit">Sign up</button>
    </form>
  </main>;
};

const Main = (props: { user: UserMaybe, noteID: string }) => {
  // @ts-ignore: See above.
  let editorNode: HTMLElement = undefined;
  let editorView;
  createEffect(() => { editorView = initializeEditorView(editorNode) });
  return <div>
      <header><h1>Good evening</h1>
        <Switch>
          <Match when={props.user !== null}>
            <span>
              <strong>{props.user?.email}</strong>
              <button>Sign out</button>
            </span>
          </Match>
          <Match when={props.user === null}>
            <span>
              <Link to="signup" title="Create an account">Create an account</Link>
              <Link to="signin" title="Sign in">Sign in</Link>
            </span>
          </Match>
        </Switch>
      </header>
      <nav><ul></ul></nav>
      <main>
        <article ref={editorNode}></article>
      </main>
    </div>;
};

type Route = { page: string, rest: string[], title: string | undefined }

const UnknownURL = () => {
  const { route } = useContext(Router);
  return <main>
    <h1>Page not found!</h1>
    <p>The url {[route.page, ...route.rest].join("/")} does not correspond to any page.</p>
  </main>
};

const App = () => {
  const [getUser, setUser] = createSignal(null as UserMaybe);
  return <Routed>
    <h1>Bonjour!</h1>
    <Page getUser={getUser} setUser={setUser}/>
  </Routed>
}

const Page = ({ getUser, setUser }: { getUser: () => UserMaybe, setUser: (u: UserMaybe) => UserMaybe }) => {
  const { route } = useContext(Router);
  return <Switch fallback={<UnknownURL/>}>
    <Match when={route.page === "signup"}>
      <SignUp setUser={setUser}/>
    </Match>
    <Match when={route.page === "notes"}>
      <Main user={getUser()} noteID={route.rest[0]}/>
    </Match>
  </Switch>
}

render(() => <App/>, document.body);

async function fetchNote(noteId: string) {
  const { data, error } = await database.from('notes').select().eq('id', noteId);
  if (error) { console.error(error); }
  return data;
}

// Client-side routing function.
function interpretURL(setRoute: (route: Route) => void) {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = window.location.pathname.split('/').slice(1);
  // Ignore a trailing slash.
  if (pathParts[pathParts.length - 1] === "") { pathParts.pop() }
  setRoute({ page: pathParts[0], rest: pathParts.slice(1), title: undefined });
}
