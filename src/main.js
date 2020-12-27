"use strict";

import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {exampleSetup} from "prosemirror-example-setup"

import { observable, subscribe } from 'sinuous/observable';
import { h } from 'sinuous';

import { createClient } from '@supabase/supabase-js';

// document.addEventListener("DOMContentLoaded", (event) => ());

const user = observable(null);

const currentNotebook = observable(null);
const currentNote = observable(null);
function interpretURL() {
  // Split on the path separator; ignore the first element, as it is the empty string
  // (because the path begins with a slash).
  let pathParts = window.location.pathname.split('/').slice(1);
  // The first part is the name of the notebook.
  currentNotebook(pathParts[0]);
  // The second part is the identifier of the note we are displaying.
  currentNote(pathParts[1]);
}

function signUp(event) {
  user("Potato");
}
function signIn(event) {
  user("Ptomonot");
}
function signOut(event) {
  user(null);
}

const AuthControls = () => {
    return user() === null
      ? html`
        <button onclick=${signUp}>Create account</button>
        <button onclick=${signIn}>Sign in</button>
      ` : html`
        <strong>${user()}</strong>
        <button onclick=${signOut}>Sign out</button>
      `;
}

function createEditor({ editor, content }) {
  let state = EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(content), 
    plugins: exampleSetup({schema: schema, menuBar: false})
  });
  return new EditorView(editor, { state });
}

const Page = props => {
  return html`
    <header><h1>Good evening</h1> ${AuthControls}</header>
    <nav><a onclick=${() => currentNote(1)}>Note 1</a></nav>
    <main>
      <article id=editor></article>
    </main>
  `;
}

document.body.append(Page({}));

const SUPABASE_URL = "https://qhqomieoafclafetsoxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwODgyMzk3MSwiZXhwIjoxOTI0Mzk5OTcxfQ.ZBHH8NRe8eMVj8xuNUHoLuroL--zvKVO6YYsPS2zJqQ";
const database = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchNote(noteId) {
  const { data, error } = await database.from('notes').select().eq('id', noteId);
  if (error) { console.error(error); }
  return data;
}

let editor;
let noteContent = document.createElement("article");
subscribe(() => {
  let noteId = currentNote();
  if (noteId) {
    let note = fetchNote(noteId).then(([note]) => {
      noteContent.innerHTML = note.body;
      editor = createEditor({ editor: document.getElementById("editor"), content: noteContent });
    });
  }
});

interpretURL();