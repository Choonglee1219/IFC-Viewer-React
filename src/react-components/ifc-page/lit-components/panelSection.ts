import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const PanelSection = createComponent({
    react: React,
    tagName: 'bim-panel-section',
    elementClass: BUI.PanelSection
})