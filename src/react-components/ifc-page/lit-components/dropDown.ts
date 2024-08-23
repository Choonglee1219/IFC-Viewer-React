import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const Dropdown = createComponent({
    react: React,
    tagName: 'bim-dropdown',
    elementClass: BUI.Dropdown,
    events: {
        change: 'change'
    }
})