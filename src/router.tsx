import { Children } from './types'

import {
  createSignal, createState,
  createContext,
  createComputed, batch, } from "solid-js";

export {
  Route, urlOfRoute, routeOfRelativeURL,
  Page, AllNotes, NewNote, EditNote,
  Router, RoutingContext,
}

interface Route { page: Page, noteID?: string };

function urlOfRoute(route: Partial<Route>): string {
  let noteID = route.noteID;
  return '/' + (route.page ?? Page.Notes) + (noteID ? '/' + noteID : '');
}

function routeOfRelativeURL(url: string): Route {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = url.split('/').slice(1);
  // Ignore a trailing slash.
  if (pathParts[pathParts.length - 1] === "") { pathParts.pop() }
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

enum Page {
  Notes = "notes",
  SignIn = "signin",
  SignUp = "signup",
  Unknown = "404"
}

const AllNotes: Route = { page: Page.Notes, noteID: undefined }
const NewNote: Route = { page: Page.Notes, noteID: "new" }
const EditNote: (id: string) => Route = (noteID) => ({ page: Page.Notes, noteID })

const defaultRoute: Route = { page: Page.Notes }
const Router = createContext({ route: defaultRoute, goTo(_route: Route) {} });

const RoutingContext = (props: { children: Children }) => {
  // We create a pair of reactive state nodes. The first is written to by the
  // router and read by other components so they can react to changes in the
  // route. The second is written to by other components whenever they want to
  // navigate to a different route, and read by the router so that it can carry
  // out the navigation and subsequently update the first state node. Simpler to
  // understand the data flow than with a single state node.

  // What is the current route.
  const [route, setRoute] = createState(defaultRoute);

  const initialRoute = routeOfWindowLocation();

  // What route must we navigate to.
  const [requestedPage, setPage] = createSignal(initialRoute.page, true);
  const [requestedNoteID, setNoteID] = createSignal(initialRoute.noteID, true);

  function routeOfWindowLocation(): Route { return routeOfRelativeURL(window.location.pathname); }

  function goTo(route: Route) { batch(() => { setPage(route.page); setNoteID(route.noteID) }) }

  window.onpopstate = (_event: PopStateEvent) => { setRoute(routeOfWindowLocation()) };

  createComputed(() => setRoute("page", requestedPage()))
  createComputed(() => setRoute("noteID", requestedNoteID()))

  const router = { route, goTo };
  return <Router.Provider value={router}>{props.children}</Router.Provider>
}

