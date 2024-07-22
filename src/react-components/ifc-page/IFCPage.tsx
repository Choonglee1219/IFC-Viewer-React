import * as BUI from "@thatopen/ui"
import * as OBC from "@thatopen/components"
import * as OBF from "@thatopen/components-front"
import * as CUI from "./tables/index"
import * as WEBIFC from 'web-ifc'
import React, { useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ProjectsManager } from "../../classes/ProjectsManager";
import { createComponent } from '@lit/react';
import { Resizable } from 're-resizable';
import './ifc_page.css'

interface Props {
  projectsManager: ProjectsManager
}
//BUI init
BUI.Manager.init()

export default function IFCPage(props: Props) {
  const navigate = useNavigate();
  //project info from props
  const routeParams = useParams<{ id: string }>()
  if (!routeParams.id) {return (<p>Project ID is needed to see this page</p>)}
  const project = props.projectsManager.getProject(routeParams.id)
  if (!project) {return (<p>The project with ID {routeParams.id} wasn't found.</p>)}

  const goBack = () => {
    navigate(-1)
  }

  const viewerRef = useRef<HTMLElement>(null)
  const treeRef = useRef<HTMLElement>(null)
  const propertyRef = useRef<HTMLElement>(null)

  //create ifc-viewer
  const createViewer = async () => {
    const components = new OBC.Components()
    const viewport = viewerRef.current as HTMLElement

    //init
    const worlds = components.get(OBC.Worlds)
    const world = worlds.create()
    const sceneComponent = new OBC.SimpleScene(components)
    sceneComponent.setup()
    world.scene = sceneComponent
    const rendererComponent = new OBC.SimpleRenderer(components, viewport)
    world.renderer = rendererComponent
    const cameraComponent = new OBC.SimpleCamera(components)
    world.camera = cameraComponent

    //background grid
    const grids = components.get(OBC.Grids);
    grids.create(world);

    components.init()

    //fragment highlighter
    const highlighter = components.get(OBF.Highlighter)
    highlighter.setup({ world })

    //ifc loader
    const ifcLoader = components.get(OBC.IfcLoader)
    await ifcLoader.setup()

    //fragments loader
    const fragments = components.get(OBC.FragmentsManager)
    const fragmentIfcLoader = components.get(OBC.IfcLoader)
    await fragmentIfcLoader.setup();
    const excludedCats = [
      WEBIFC.IFCTENDONANCHOR,
      WEBIFC.IFCREINFORCINGBAR,
      WEBIFC.IFCREINFORCINGELEMENT,
    ];
    
    for (const cat of excludedCats) {
      fragmentIfcLoader.settings.excludedCategories.add(cat)
    }
    fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true

    //fragments manager
    const fragmentsManager = components.get(OBC.FragmentsManager)
    fragmentsManager.onFragmentsLoaded.add((model) => {
      if (world.scene) world.scene.three.add(model)
    });
    
    //create Classification Tree
    const indexer = components.get(OBC.IfcRelationsIndexer)
    fragmentsManager.onFragmentsLoaded.add(async (model) => {
      if (model.hasProperties) {
        await indexer.process(model)
      }
    });
    const [relationsTree] = CUI.tables.relationsTree({
      components,
      models: [],
    })
    relationsTree.preserveStructureOnFilter = true
    const classTable = BUI.Component.create(() => {
      return BUI.html`
      ${relationsTree}
      `
    })
    treeRef.current?.appendChild(classTable)

    //element properties
    const [propertiesTable, updatePropertiesTable] = CUI.tables.elementProperties({
      components,
      fragmentIdMap: {},
    });
    
    propertiesTable.preserveStructureOnFilter = true;
    propertiesTable.indentationInText = false;
    
    highlighter.events.select.onHighlight.add((fragmentIdMap) => {
      updatePropertiesTable({ fragmentIdMap });
    });
    
    highlighter.events.select.onClear.add(() =>
      updatePropertiesTable({ fragmentIdMap: {} }),
    );
    const propertyTable = BUI.Component.create(() => {
      return BUI.html`
      ${propertiesTable}
      `
    })
    propertyRef.current?.appendChild(propertyTable)

    //load model
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
  const Label = createComponent({
    react: React,
    tagName: 'bim-label',
    elementClass: BUI.Label
  })
  const Tabs = createComponent({
    react: React,
    tagName: 'bim-tabs',
    elementClass: BUI.Tabs
  })
  const Tab = createComponent({
    react: React,
    tagName: 'bim-tab',
    elementClass: BUI.Tab
  })
  const ToolBar = createComponent({
    react: React,
    tagName: 'bim-toolbar',
    elementClass: BUI.Toolbar
  })
  const ToolBarSection = createComponent({
    react: React,
    tagName: 'bim-toolbar-section',
    elementClass: BUI.ToolbarSection
  })
  const Panel = createComponent({
    react: React,
    tagName: 'bim-panel',
    elementClass: BUI.Panel
  })
  const PanelSection = createComponent({
    react: React,
    tagName: 'bim-panel-section',
    elementClass: BUI.PanelSection
  })
  
  useEffect(() => {
    createViewer()
    return () => {
      
    }
  }, [])

  return (
    <div className="ifc_page_container">
      {/******** Page Header ********/}
      <div className="ifc_page_header">
        <ToolBar>
          <ToolBarSection>
            <Button vertical label="" click={() => goBack()} icon="ic:sharp-arrow-back" />
            <Label style={{margin: '0 2rem 0 2rem', color: 'white'}}>{project.name}</Label>
          </ToolBarSection>
        </ToolBar>
        <ToolBar>
          <ToolBarSection>
            <Button vertical label="Load IFC" click={() => goBack()} icon="mage:box-3d-fill" />
            <Button vertical label="Load FRAG" click={() => goBack()} icon="ic:sharp-upload" />
            <Button vertical label="Model List" click={() => goBack()} icon="ic:outline-list" />
            <Button vertical label="Create Todo" click={() => goBack()} icon="ic:baseline-create" />
            <Button vertical label="Todo List" click={() => goBack()} icon="ic:outline-list" />
          </ToolBarSection>
        </ToolBar>
      </div>
      {/******** Page Body ********/}
      <div style={{display: 'flex', width: '100%', height: '90%', justifyContent: 'space-between'}}>
        {/******** Page Body Left ********/}
          <Panel style={{minWidth: '15%'}}>
            <PanelSection label='Classification Tree'>
              <div id="tree_container" ref={treeRef} ></div>
            </PanelSection>
          </Panel>
        {/******** Page Body Center********/}
        <div>
          <Resizable
            enable={{
              top: false,
              topLeft: false,
              topRight: false,
              left: true,
              right: true,
              bottom: true,
              bottomLeft: true,
              bottomRight: true
            }}
          >
            <div id="ifc_viewer" ref={viewerRef}></div>
          </Resizable>
          {/******** Page Bottom ********/}
          <Button label="test-bottom section"/>
        </div>
        {/******** Page Right ********/}
          <Panel style={{minWidth: '15%'}}>
            <PanelSection label='Properties'>
              <div id="properties_container" ref={propertyRef}></div>
            </PanelSection>
            <PanelSection label='Quantification'>
              <div id='test'></div>
            </PanelSection>
          </Panel>
      </div>
    </div>
  );
};
