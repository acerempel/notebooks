"use strict";

import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {exampleSetup} from "prosemirror-example-setup"

import { observable, html, subscribe } from 'sinuous';

// document.addEventListener("DOMContentLoaded", (event) => ());

let view;
function createEditor({ editorId, contentId }) {
  view = new EditorView(document.getElementById(editorId), {
    state: EditorState.create({
      doc: DOMParser.fromSchema(schema).parse(document.getElementById(contentId)), 
      plugins: exampleSetup({schema: schema, menuBar: false})
    })
  });
}

const user = observable(null);
function signUp(event) {
  alert("You are signed up!");
  user("Potato");
}
const Page = props => {
  return html`
    ${
      if (user() === null) {
        html`
          You are not signed up!
          <button onclick=${signUp}>Sign up</button>
        `
      } else { html`Hello, ${user()}!` }
    }
  `;
}