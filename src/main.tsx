import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import {plugins} from "./editor/plugins"

import { createClient, User } from '@supabase/supabase-js';

import { createSignal, createState, createEffect, createContext, useContext, JSX } from "solid-js";
import { render, Switch, Match, Dynamic } from "solid-js/web";

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

interface Route { page: Page, noteID?: string };
function urlOfRoute(route: Route) {
  let noteID;
  return '/' + route.page + (noteID = route.noteID ? '/' + noteID : '');
}

enum Page {
  Notes = "notes",
  SignIn = "signin",
  SignUp = "signup",
  Unknown = "404"
}

type UserMaybe = User | null;

const ActiveUser = createContext({
  user: () => null as UserMaybe,
  setUser: (_: UserMaybe) => null as UserMaybe
});

const UserContext = (props: { children: JSX.Element | JSX.Element[] }) => {
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

const Notes = () => {
  // @ts-ignore: See above.
  let editorNode: HTMLElement = undefined;
  let editorView;
  const { user } = useContext(ActiveUser);
  createEffect(() => { editorView = initializeEditorView(editorNode) });
  return <div>
      <header><h1>Good evening</h1>
        <Switch>
          <Match when={user() !== null}>
            <span>
              <strong>{user()?.email}</strong>
              <button>Sign out</button>
            </span>
          </Match>
          <Match when={user() === null}>
            <span>
              <Link to={Page.SignUp}>Create an account</Link>
              <Link to={Page.SignIn}>Sign in</Link>
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

const UnknownURL = () => {
  const { route } = useContext(Router);
  return <main>
    <h1>Page not found!</h1>
    <p>The url {urlOfRoute(route)} does not correspond to any page.</p>
  </main>
};

const App = () => {
  return <UserContext><Routed>
    <h1>Bonjour!</h1>
    <Main/>
  </Routed></UserContext>
}

const Main = () => {
  const { route } = useContext(Router);
  return <Dynamic component={Pages[route.page].component}/>
}

interface PageInfo { title: string, component: () => JSX.Element };
const Pages: Record<Page, PageInfo> = {
  notes: { title: "Notes", component: Notes },
  signup: { title: "Create an account", component: SignUp },
  signin: { title: "Sign in", component: () => <p>Oh no!</p> },
  '404': { title: "Page not found", component: UnknownURL }
}

const defaultRoute: Route = { page: Page.Notes }
const Router = createContext({ route: defaultRoute, goTo(_: Route, __?: string) {} });

const Routed = (props: { children: JSX.Element[] | JSX.Element }) => {
  const [route, setRoute]: [Route, (to: Route) => void] = createState(defaultRoute);
  window.onpopstate = (event: PopStateEvent) => {
    let newRoute;
    if (event.state) {
      newRoute = event.state;
    } else {
      newRoute = routeOfRelativeURL(window.location.pathname);
      history.replaceState(newRoute, Pages[newRoute.page].title, urlOfRoute(newRoute));
    }
    setRoute(newRoute);
  };
  createEffect(() => document.title = Pages[route.page].title);
  const goTo = (to: Route, url?: string) => {
    history.pushState(to, Pages[to.page].title, url || urlOfRoute(to));
    setRoute(to);
  }
  const router = { route, goTo };
  return <Router.Provider value={router}>{props.children}</Router.Provider>
}

const Link = (props: { children: JSX.Element[] | JSX.Element, to: Page, noteID?: string }) => {
  let route = { page: props.to, noteID: props.noteID };
  const router = useContext(Router);
  const url = urlOfRoute(route);
  const handleClick = (event: Event) => {
    event.preventDefault();
    router.goTo(route, url);
  }
  return <a href={url} onClick={handleClick}>{props.children}</a>
}

render(() => <App/>, document.body);

async function fetchNote(noteId: string) {
  const { data, error } = await database.from('notes').select().eq('id', noteId);
  if (error) { console.error(error); }
  return data;
}

function routeOfRelativeURL(url: string): Route {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = url.split('/').slice(1);
  // Ignore a trailing slash.
  if (pathParts[pathParts.length - 1] === "") { pathParts.pop() }
  console.log("PathParts", pathParts);
  let page; let noteID = undefined;
  // Can't do `pathParts === []`, because arrays are objects and are all distinct.
  if (pathParts.length === 0) {
    page = Page.Notes;
  } else {
    switch (pathParts[0]) {
      case "notes": page = Page.Notes; break;
      case "signup": page = Page.SignUp; break;
      case "signin": page = Page.SignIn; break;
      default: page = Page.Unknown;
    }
    noteID = pathParts[1] ?? undefined;
  }
  return { page, noteID };
}
