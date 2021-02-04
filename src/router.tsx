import {
  Children, EditorMode, EditorModeRoute,
  NoteID, HistoryChangeMode,
} from './types'

import {
  createState,
  createContext,
  reconcile
} from "solid-js";

export {
  Route, urlOfRoute, routeOfRelativeURL,
  Page, AllNotes, NewNote, EditNote,
  Router, RoutingContext,
}

interface NotesRoute { page: Page.Notes, editorMode: EditorModeRoute }
type Route = NotesRoute

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
      default: throw new Error(`Unknown URL for client-side router: ${url}`)
    }
  }
}

enum Page {
  Notes = "notes",
}

const AllNotes: NotesRoute = { page: Page.Notes, editorMode: { mode: EditorMode.Disabled } }
const NewNote: NotesRoute = { page: Page.Notes, editorMode: { mode: EditorMode.New } }
const EditNote: (id: NoteID) => NotesRoute =
  (noteID) => ({ page: Page.Notes, editorMode: { mode: EditorMode.Edit, noteID } })

const defaultRoute: Route = AllNotes
const Router = createContext({
  route: defaultRoute as Route,
  goTo(_route: Route, _title?: string, _method?: HistoryChangeMode) {},
  replaceLocation(_route: Route, _title?: string) {}
});

const RoutingContext = (props: { children: Children }) => {

  const initialRoute = routeOfWindowLocation();

  // What is the current route.
  const [route, setRoute] = createState(initialRoute);

  function routeOfWindowLocation(): Route {
    return routeOfRelativeURL(window.location.pathname);
  }

  function goTo(
    newRoute: Route, title = "",
    method: HistoryChangeMode = HistoryChangeMode.Push
  ) {
    const url = urlOfRoute(newRoute);
    switch (method) {
      case HistoryChangeMode.Push:
        history.pushState(null, title, url); break;
      case HistoryChangeMode.Replace:
        history.pushState(null, title, url); break;
    }
    setRoute(reconcile(newRoute))
  }

  window.onpopstate = (_event: PopStateEvent) => {
    setRoute(routeOfWindowLocation())
  };

  function replaceLocation(newRoute: Route, title = "") {
    history.replaceState(null, title, urlOfRoute(newRoute))
  }

  const router = { route, goTo, replaceLocation };
  return <Router.Provider value={router}>{props.children}</Router.Provider>
}

