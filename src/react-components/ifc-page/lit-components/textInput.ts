import { createComponent } from "@lit/react";
import React from "react";
import * as BUI from "@thatopen/ui"

export const TextInput = createComponent({
    react: React,
    tagName: 'bim-text-input',
    elementClass: BUI.TextInput,
    events: {
        input: 'input',
    }
})