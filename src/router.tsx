import {
  Children, EditorMode, EditorModeRoute,
  NoteID,
} from './types'

import {
  createSignal, createState,
  createContext,
  createComputed, batch,
} from "solid-js";

export {
  Route, urlOfRoute, routeOfRelativeURL,
  Page, AllNotes, NewNote, EditNote,
  Router, RoutingContext,
}

interface NotesRoute { page: Page.Notes, editorMode: EditorModeRoute }
type Route = NotesRoute | { page: Exclude<Page, NotesRoute["page"]> }

function urlOfRoute(route: Route): string {
  let comp1 = route.page;
  let comp2 = "";
  if (route.page === Page.Notes) {
    switch (route.editorMode.mode) {
      case EditorMode.New:
        comp2 = "/new"; break;
      case EditorMode.Edit:
        comp2 = '/' + route.editorMode.noteID; break;
      case EditorMode.Disabled:
        break;
    }
  }
  return '/' + comp1 + comp2
}

function routeOfRelativeURL(url: string): Route {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = url.split('/').slice(1);
  // Ignore a trailing slash.
  if (pathParts[pathParts.length - 1] === "") { pathParts.pop() }
  // Can't do `pathParts === []`, because arrays are objects and are all distinct.
  if (pathParts.length === 0) {
    return AllNotes;
  } else {
    switch (pathParts[0]) {
      case Page.Notes:
        let subroute = pathParts[1];
        if (subroute === EditorMode.New) { return NewNote }
        else if (subroute) { return EditNote(subroute) }
        else { return AllNotes }
      case Page.SignUp: return { page: Page.SignUp };
      case Page.SignIn: return { page: Page.SignIn };
      default: return { page: Page.Unknown }
    }
  }
}

enum Page {
  Notes = "notes",
  SignIn = "signin",
  SignUp = "signup",
  Unknown = "404"
}

const AllNotes: NotesRoute = { page: Page.Notes, editorMode: { mode: EditorMode.Disabled } }
const NewNote: NotesRoute = { page: Page.Notes, editorMode: { mode: EditorMode.New } }
const EditNote: (id: NoteID) => NotesRoute =
  (noteID) => ({ page: Page.Notes, editorMode: { mode: EditorMode.Edit, noteID } })

const defaultRoute: Route = AllNotes
const Router = createContext({ route: defaultRoute as Route, goTo(_route: Route) {} });

const RoutingContext = (props: { children: Children }) => {

  // What is the current route.
  const [route, setRoute] = createState(defaultRoute as Route);

  const initialRoute = routeOfWindowLocation();

  // What route must we navigate to.
  const [requestedPage, setPage] = createSignal(initialRoute.page, true);

  function routeOfWindowLocation(): Route { return routeOfRelativeURL(window.location.pathname); }

  function goTo(route: Route) { setRoute(route) }

  window.onpopstate = (_event: PopStateEvent) => { setRoute(routeOfWindowLocation()) };

  createComputed(() => setRoute("page", requestedPage()))

  const router = { route, goTo };
  return <Router.Provider value={router}>{props.children}</Router.Provider>
}

