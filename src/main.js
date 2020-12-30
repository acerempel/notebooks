"use strict";

import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {exampleSetup} from "prosemirror-example-setup"

import { createClient } from '@supabase/supabase-js';

import h from 'stage0';

function interpretURL() {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = window.location.pathname.split('/').slice(1);
  // The first part is the name of the notebook.
  currentNotebook(pathParts[0]);
  // The second part is the identifier of the note we are displaying.
  currentNote(pathParts[1]);
}

const noUserButtons = h`
  <span>
    <button #signupbutton>Create account</button>
    <button #signinbutton>Sign in</button>
  </span>
`;

const authenticatedButtons = h`
  <span>
    <strong>#userName</strong>
    <button #signoutbutton>Sign out</button>
  </span>
`;

const page = h`
  <div>
    <header><h1>Good evening</h1><span #userbuttons></span></header>
    <nav #notelist></nav>
    <main>
      <article #editor></article>
    </main>
  </div>
`;

function Page() {
  const { userbuttons, notelist, editor } = page.collect(page);
  const { userName, signoutbutton } = authenticatedButtons.collect(authenticatedButtons);
  const { signupbutton, signinbutton } = noUserButtons.collect(noUserButtons);

  let user = null;
  function updateUser(newUser) {
    user = newUser;
    userName.nodeValue = user;
  }

  function signIn(_) {
    updateUser("Potato");
    noUserButtons.replaceWith(authenticatedButtons);
  }
  function signOut(_) {
    authenticatedButtons.replaceWith(noUserButtons);
  }
  function signUp(_) {
    updateUser("Tomato");
    noUserButtons.replaceWith(authenticatedButtons);
  }
  signupbutton.onclick = signUp;
  signoutbutton.onclick = signOut;
  signinbutton.onclick = signIn;
  userbuttons.prepend(noUserButtons);

  const editorStateConfig = { schema, plugins: exampleSetup({schema: schema, menuBar: false}) };
  let editorView = function() {
    let state = EditorState.create(editorStateConfig);
    return new EditorView(editor, { state });
  }();
  function setEditorState(jsonDoc) {
    let newEditorState = EditorState.fromJSON(editorStateConfig, jsonDoc);
    editorView.updateState(newEditorState);
  }
  function getEditorState() {
    return editorView.state.toJSON();
  }

  return page; 
}

document.body.append(Page());

const SUPABASE_URL = "https://qhqomieoafclafetsoxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwODgyMzk3MSwiZXhwIjoxOTI0Mzk5OTcxfQ.ZBHH8NRe8eMVj8xuNUHoLuroL--zvKVO6YYsPS2zJqQ";
const database = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchNote(noteId) {
  const { data, error } = await database.from('notes').select().eq('id', noteId);
  if (error) { console.error(error); }
  return data;
}