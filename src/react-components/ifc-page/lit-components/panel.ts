import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const Panel = createComponent({
    react: React,
    tagName: 'bim-panel',
    elementClass: BUI.Panel
})