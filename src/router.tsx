import {
  Children,
  NoteID, HistoryChangeMode,
} from './types'

import {
  createState,
  createContext,
  reconcile
} from "solid-js";

export {
  Route, urlOfRoute, routeOfRelativeURL,
  AllNotes, NewNote, EditNote,
  Router, RoutingContext, EditorMode
}

enum EditorMode {
  New = "new",
  Edit = "edit",
  Disabled = "off",
}

type NewEditorMode = { mode: EditorMode.New }
type EditEditorMode = { mode: EditorMode.Edit, noteID: NoteID }
type DisabledEditorMode = { mode: EditorMode.Disabled }
type Route =
  | NewEditorMode
  | EditEditorMode
  | DisabledEditorMode

function urlOfRoute(route: Route): string {
  switch (route.mode) {
    case EditorMode.New:
      return '/notes/new';
    case EditorMode.Edit:
      return '/notes/' + route.noteID;
    case EditorMode.Disabled:
      return '/notes';
  }
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
      case 'notes':
        let subroute = pathParts[1];
        if (subroute === EditorMode.New) { return NewNote }
        else if (subroute) { return EditNote(subroute) }
        else { return AllNotes }
      default: throw new Error(`Unknown URL for client-side router: ${url}`)
    }
  }
}

const AllNotes: Route = { mode: EditorMode.Disabled }
const NewNote: Route = { mode: EditorMode.New }
const EditNote: (id: NoteID) => Route =
  (noteID) => ({ mode: EditorMode.Edit, noteID })

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

