import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const Button = createComponent({
    react: React,
    tagName: 'bim-button',
    elementClass: BUI.Button,
    events: {
      click: 'click'
    }
})