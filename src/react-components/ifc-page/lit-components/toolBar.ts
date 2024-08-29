import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const ToolBar = createComponent({
    react: React,
    tagName: 'bim-toolbar',
    elementClass: BUI.Toolbar
})