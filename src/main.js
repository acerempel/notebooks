"use strict";

import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import {exampleSetup} from "prosemirror-example-setup"

import { createClient } from '@supabase/supabase-js';

import h from 'stage0';
import S from 'S';

function displayError(er) {
  console.error(er); // TODO show it in the DOM
}

class Page {
  constructor(title, path, initialize) {
    this.title = title;
    this.path = path;
    this.initialize = initialize;
    this._node = undefined;
  }
  get node() {
    let node;
    if (node = this._node) { return node; }
    else {
      node = this.initialize();
      this._node = node;
      return node;
    }
  }
}

const activePage = S.value(undefined);
let previousPage = undefined;
const parentNode = document.body;

function switchPages() {
  let newPage = activePage();
  if (newPage !== undefined) {
    history.pushState({}, newPage.title, newPage.path);
    previousPage.node.replaceWith(newPage.node);
  } else {
    parentNode.appendChild(newPage.node);
    history.replaceState({}, newPage.title, newPage.path);
  }
  previousPage = newPage;
}

S(switchPages);

// Initialize the ProseMirror editor in the given DOM node.
function initializeEditorView(editorElement) {
  const editorStateConfig = { schema, plugins: exampleSetup({schema: schema, menuBar: false}) };
  let state = EditorState.create(editorStateConfig);
  let view = new EditorView(editorElement, { state });
  view.setEditorState = function(jsonDoc) {
    let newEditorState = EditorState.fromJSON(editorStateConfig, jsonDoc);
    this.updateState(newEditorState);
  }
  view.getEditorState = function() {
    return this.state.toJSON();
  }
  return view;
}

const signInView = h`
  <form #signinform>
    <label>Email <input type=email #email></label>
    <label>Password <input type=password #password></label>
    <button type=submit>Sign in</button>
  </form>
`;

const signUpView = h`
  <main>
    <h1>Create an account</h1>
    <form #signupform>
      <label>Email <input type=email #email></label>
      <label>Password <input type=password #password></label>
      <button type=submit>Sign up</button>
    </form>
  </main>
`;

const activeUser = S.data(undefined);

const SignUp = new Page("Create an account", "/signup", () => {
  const { signupform, email, password } = signUpView.collect(signUpView);
  signupform.onsubmit = function(event) {
    event.preventDefault();
    let { user, error } = supabase.auth.signUp({ email: email.value, password: password.value });
    if (error) { displayError(error) }
    else { activeUser(user); }
  }
  return signUpView;
});

let notes = S.data(null);

const noteListItemView = h`
  <li>
    <a #notelink></a>
  </li>
`;

function NoteListItem(note) {
  const view = noteListItemView.cloneNode(true);
  const { notelink } = noteListItemView.collect(view);
  notelink.href = `/notes/${note.id}`;
  notelink.onclick = activePage(Main);
  return view;
}

const noUserButtons = h`
  <span>
    <a href=/signup>Create account</a>
    <a href=/signin>Sign in</a>
  </span>
`;

const authenticatedButtons = h`
  <span>
    <strong>#userName</strong>
    <button #signoutbutton>Sign out</button>
  </span>
`;

const mainView = h`
  <div>
    <header><h1>Good evening</h1><span #userbuttons></span></header>
    <nav><ul #notelist></ul></nav>
    <main>
      <article #editor></article>
    </main>
  </div>
`;

const Main = new Page("Good evening!", "/notes", () => {
  const { userbuttons, notelist, editor } = mainView.collect(mainView);
  const { userName, signoutbutton } = authenticatedButtons.collect(authenticatedButtons);
  const { signupbutton, signinbutton } = noUserButtons.collect(noUserButtons);

  signupbutton.onclick = (_) => activePage(SignUp);
  signoutbutton.onclick = (_) => activePage(SignOut);
  signinbutton.onclick = (_) => activePage(SignIn);

  S(() => {
    let user = activeUser();
    if (activeUser) {
      userName.nodeValue = user.email;
      noUserButtons.replaceWith(authenticatedButtons);
    } else if (activeUser === null) {
      authenticatedButtons.replaceWith(noUserButtons);
    } else if (activeUser === undefined) {
      userbuttons.prepend(noUserButtons);
    }
  });

  return mainView;
});

function goToNote(note) {
  history.pushState({}, note.title, noteURL(note));
  setEditorState(note.body);
}

const SUPABASE_URL = "https://qhqomieoafclafetsoxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwODgyMzk3MSwiZXhwIjoxOTI0Mzk5OTcxfQ.ZBHH8NRe8eMVj8xuNUHoLuroL--zvKVO6YYsPS2zJqQ";
const database = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchNote(noteId) {
  const { data, error } = await database.from('notes').select().eq('id', noteId);
  if (error) { console.error(error); }
  return data;
}

// Client-side routing function.
function interpretURL(_event) {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = window.location.pathname.split('/').slice(1);
  // Ignore a trailing slash.
  if (pathParts[pathParts.length - 1] === "") { pathParts.pop() }
  // If the path is / then go to the main page.
  if (pathParts.length === 0) { goToMain(); }
  else if (pathParts.length === 1) {
    let pathItem = pathParts[0];
    if (pathItem === "signup") { goToSignUp(); }
    else if (pathItem === "signin") { goToSignIn(); }
  } else if (pathParts.length === 2 && pathParts[0] === "note") {
    goToNote(parseInt(pathParts[0]));
  } else { // TODO create a "404" page (obviously no real 404s involved!)
    console.warn(`Unknown URL: ${window.location.href}`);
  }
}
window.onpopstate = interpretURL;

activePage(Main);
