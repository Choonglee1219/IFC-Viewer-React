import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const ToolBarSection = createComponent({
    react: React,
    tagName: 'bim-toolbar-section',
    elementClass: BUI.ToolbarSection
})
