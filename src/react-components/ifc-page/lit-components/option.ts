import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const Option = createComponent({
    react: React,
    tagName: 'bim-option',
    elementClass: BUI.Option,
})