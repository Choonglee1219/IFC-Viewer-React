import * as BUI from "@thatopen/ui"
import * as OBC from "@thatopen/components"
//import * as OBC from "openbim-components"
import * as WEBIFC from 'web-ifc'
import * as OBF from "@thatopen/components-front"
import React, { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import './ifc_page.css'
import { ProjectsManager } from "../../classes/ProjectsManager";
import { createComponent } from '@lit/react';

interface Props {
  projectsManager: ProjectsManager
}
//BUI init
BUI.Manager.init()


export default function IFCPage(props: Props) {
  //project info from props
  const routeParams = useParams<{ id: string }>()
  if (!routeParams.id) {return (<p>Project ID is needed to see this page</p>)}
  const project = props.projectsManager.getProject(routeParams.id)
  if (!project) {return (<p>The project with ID {routeParams.id} wasn't found.</p>)}

  //create ifc-viewer
  const ref = React.useRef<HTMLElement>(null)
  const createViewer = async () => {
    const components = new OBC.Components()
    const viewport = ref.current as HTMLElement

    // const sceneComponent = new OBC.SimpleScene(viewer)
    // sceneComponent.setup()
    // viewer.scene = sceneComponent
    // const scene = sceneComponent.get()
    // scene.background = null

    // const viewerContainer = ref.current as HTMLElement
    // const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
    // viewer.renderer = rendererComponent

    // const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
    // viewer.camera = cameraComponent

    // const raycasterComponent = new OBC.SimpleRaycaster(viewer)
    // viewer.raycaster = raycasterComponent

    // viewer.init()
    // cameraComponent.updateAspect()
    // rendererComponent.postproduction.enabled = true
    // const ifcLoader = new OBC.FragmentIfcLoader(viewer)
    // ifcLoader.settings.wasm = {
    //   path: "https://unpkg.com/web-ifc@0.0.43/",
    //   absolute: true
    // }
    // const highlighter = new OBC.FragmentHighlighter(viewer)
    // highlighter.setup()
    // const model = await ifcLoader.load(project.ifc_data, '123');
    // scene.add(model)

    //before
    const worlds = components.get(OBC.Worlds)
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >()
    
    world.scene = new OBC.SimpleScene(components)
    world.renderer = new OBC.SimpleRenderer(components, viewport)
    world.camera = new OBC.SimpleCamera(components)
    
    components.init()
    world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);
    world.scene.setup()
    world.renderer.enabled = true
    //background grid
    const grids = components.get(OBC.Grids);
    grids.create(world);

    const highlighter = components.get(OBF.Highlighter)
    highlighter.setup({ world })

    const ifcLoader = components.get(OBC.IfcLoader)
    await ifcLoader.setup()
    const fragments = components.get(OBC.FragmentsManager)
    const fragmentIfcLoader = components.get(OBC.IfcLoader)
    await fragmentIfcLoader.setup();
    const excludedCats = [
      WEBIFC.IFCTENDONANCHOR,
      WEBIFC.IFCREINFORCINGBAR,
      WEBIFC.IFCREINFORCINGELEMENT,
    ];
    
    for (const cat of excludedCats) {
      fragmentIfcLoader.settings.excludedCategories.add(cat);
    }
    fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

    // const file = await fetch("/src/resource/small.ifc")
    // const buffer = await file.arrayBuffer()
    // const typedArray = new Uint8Array(buffer)
    // const model = await ifcLoader.load(typedArray)
    const model = await ifcLoader.load(project.ifc_data)
    world.scene.three.add(model)
  }

  //BUI, from lit class to react component
  const Button = createComponent({
    react: React,
    tagName: 'bim-button',
    elementClass: BUI.Button,
    events: {
      click: 'click'
    }
  })

  const Tabs = createComponent({
    react: React,
    tagName: 'bim-tabs',
    elementClass: BUI.Tabs
  })

  const TabA = createComponent({
    react: React,
    tagName: 'bim-tab',
    elementClass: BUI.Tab
  })
  const ToolBarA = createComponent({
    react: React,
    tagName: 'bim-toolbar',
    elementClass: BUI.Toolbar
  })
  const ToolBarSection = createComponent({
    react: React,
    tagName: 'bim-toolbar-section',
    elementClass: BUI.ToolbarSection
  })
  const TabB = createComponent({
    react: React,
    tagName: 'bim-tab',
    elementClass: BUI.Tab
  })

  const Viewer = createComponent({
    react: React,
    tagName: 'bim-viewer',
    elementClass: BUI.Viewport
  })
  
  
  
  useEffect(() => {
    createViewer()

    return () => {
      
    }
  }, [])

  return (
    <div className="ifc_page_container">
      <ToolBarSection id="tabs"><Button label="A button" click={() => console.log('Btn Clicked')} icon="ph:export-fill" /></ToolBarSection>
      <Button label="123" click={() => console.log()} icon="ph:export-fill" />
      <Viewer id="ifc_viewer" ref={ref}></Viewer>
      <ToolBarSection><Button label="A button" click={() => console.log('Btn Clicked')} icon="ph:export-fill" /></ToolBarSection>
      <div id="bot">footer</div>
    </div>
  );
};
