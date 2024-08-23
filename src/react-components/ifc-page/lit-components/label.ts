import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const Label = createComponent({
    react: React,
    tagName: 'bim-label',
    elementClass: BUI.Label
})