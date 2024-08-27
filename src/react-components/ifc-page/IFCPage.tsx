import * as BUI from "@thatopen/ui"
import * as OBC from "@thatopen/components"
import * as OBF from "@thatopen/components-front"
import * as CUI from "./tables/index"
import * as WEBIFC from 'web-ifc'
import * as THREE from 'three'
import React, { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ProjectsManager } from "../../classes/ProjectsManager";
import { Resizable } from 're-resizable';
import './ifc_page.css'
import { ToDo, ToDoPriority } from "../../bim-components/TodoCreator"
import {
  Button,
  Dropdown,
  Label,
  Panel,
  PanelSection,
  TextInput,
  ToolBar,
  ToolBarSection,
  Option,
} from "./lit-components"

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

  //ref
  const viewerRef = useRef<HTMLElement>(null)
  const treeRef = useRef<HTMLElement>(null)
  const propertyRef = useRef<HTMLElement>(null)

  //state
  const [components, setComponents] = useState<OBC.Components>(new OBC.Components)
  const [description, setDescription] = useState<string>("")
  const [todoList, setTodoList] = useState<ToDo[]>([])
  const [priority, setPriority] = useState<ToDoPriority>()

  const navigate = useNavigate();

  const goBack = () => {
    navigate("/")
  }

  const loadIFC = () => {
    if (!components) { return }
    const ifcLoader = components.get(OBC.IfcLoader)
    const fileOpener = document.createElement("input")
    fileOpener.type = "file"
    fileOpener.accept = ".ifc"
    fileOpener.onchange = async () => {
      if (fileOpener.files === null || fileOpener.files.length === 0) return
      const file = fileOpener.files[0]
      fileOpener.remove()
      const buffer = await file.arrayBuffer()
      const data = new Uint8Array(buffer)
      const model = await ifcLoader.load(data)
      model.name = file.name.replace(".ifc", "")
    }
    fileOpener.click()
  }

  const loadFrag = () => {
    if(!components) { return }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.frag'
    const reader = new FileReader()
    reader.addEventListener("load", async () => {
      const binary = reader.result
      if (!(binary instanceof ArrayBuffer)) { return }
      const fragmentBinary = new Uint8Array(binary)
      components.get(OBC.FragmentsManager).load(fragmentBinary)
    })
    input.addEventListener('change', () => {
      const filesList = input.files
      if (!filesList) { return }
      reader.readAsArrayBuffer(filesList[0])
    })
    input.click()
  }

  const addTodo = (todo: ToDo) => {
    setTodoList(todoList => [...todoList, todo])
  }

  const createTodo = () => {
    if (!components) { return }
    if (description == "") { alert("Please enter description"); return; }
    if (!priority) { alert("Please select priority"); return; }
    const highlighter = components.get(OBF.Highlighter)
    
    const todo:ToDo = {
      description: description,
      date: new Date(),
      fragmentMap: highlighter.selection.select,
      priority: priority,
    }
    addTodo(todo)
  }

  const focusFragment = (todo: ToDo) => {
    const highlighter = components.get(OBF.Highlighter)
    highlighter.highlightByID("select", todo.fragmentMap, true, true)
  }

  const deleteTodo = (todo: ToDo) => {
    if (confirm(`Do you want to delete todo '${todo.description}' ?`)) {
      const updateToDoList = todoList.filter((item) => {
        return(item.description!=todo.description)
      })
      setTodoList(updateToDoList)
    } else {
      return
    }
  }

  //create ifc-viewer
  const createViewer = async () => {
    const viewport = viewerRef.current as HTMLElement

    //init
    const worlds = components.get(OBC.Worlds)
    const world = worlds.create()
    const sceneComponent = new OBC.SimpleScene(components)
    sceneComponent.setup()
    world.scene = sceneComponent
    const rendererComponent = new OBC.SimpleRenderer(components, viewport)
    world.renderer = rendererComponent
    const cameraComponent = new OBC.OrthoPerspectiveCamera(components)
    world.camera = cameraComponent

    //background grid
    const grids = components.get(OBC.Grids);
    grids.create(world);

    components.init()

    //fragment highlighter
    const highlighter = components.get(OBF.Highlighter)
    highlighter.add('low', new THREE.Color(89,188,89))
    highlighter.add('normal', new THREE.Color(89,124,255))
    highlighter.add('high', new THREE.Color(255,118,118))
    highlighter.setup({ world })

    //ifc loader
    const ifcLoader = components.get(OBC.IfcLoader)
    ifcLoader.settings.wasm = {
      path: "../../../node_modules/web-ifc/",
      absolute: true
    }
    await ifcLoader.setup({ autoSetWasm: false })

    //fragments loader
    const fragments = components.get(OBC.FragmentsManager)

    const excludedCats = [
      WEBIFC.IFCTENDONANCHOR,
      WEBIFC.IFCREINFORCINGBAR,
      WEBIFC.IFCREINFORCINGELEMENT,
    ];
    
    for (const cat of excludedCats) {
      ifcLoader.settings.excludedCategories.add(cat)
    }
    ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true

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
    })
    
    propertiesTable.preserveStructureOnFilter = true
    propertiesTable.indentationInText = false
    
    highlighter.events.select.onHighlight.add((fragmentIdMap) => {
      updatePropertiesTable({ fragmentIdMap })
    })
    
    highlighter.events.select.onClear.add(() =>
      updatePropertiesTable({ fragmentIdMap: {} }),
    )
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

  useEffect(() => {
    createViewer()
    return () => {
      components.dispose()
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
            <Button vertical label="Load IFC" click={() => loadIFC()} icon="mage:box-3d-fill" />
            <Button vertical label="Load FRAG" click={() => loadFrag()} icon="ic:sharp-upload" />
            <Button vertical label="Model List" icon="ic:outline-list" />
          </ToolBarSection>
        </ToolBar>
      </div>
      {/******** Page Body ********/}
      <div style={{display: 'flex', width: '100%', height: '90%', justifyContent: 'space-between'}}>
        {/******** Page Body Left ********/}
          <Panel style={{minWidth: '15vw'}}>
            <PanelSection label='Classification Tree' ref={treeRef}>
            </PanelSection>
          </Panel>
        {/******** Page Body Center********/}
        <div>
          <Resizable
            defaultSize={{height:'80%', width:'70vw'}}
            maxWidth={'70vw'}
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
          <Panel>
            <PanelSection label="Model Queries">
              {/* ^2.0에서 IfcPropertiesFinder 클래스가 제외되어 구현 못하는 기능 */}
            </PanelSection>
          </Panel>
        </div>
        {/******** Page Right ********/}
          <Panel style={{minWidth: '15vw'}}>
            <PanelSection label='Create Todo'>
              <Label>Description</Label>
              <TextInput input={(e) => {setDescription(e.target?.value)}}></TextInput>
              <Dropdown label="Priority" change={(e) => setPriority(e.target?.value)}>
                <Option label="Low"></Option>
                <Option label="Normal"></Option>
                <Option label="High"></Option>
              </Dropdown>
              <Button label="Create" click={() => createTodo()} icon="ic:baseline-create"></Button>
            </PanelSection>
            <PanelSection label="Todo List">
              {todoList.map((todo, idx) => (
                <div key={idx} className="todo_card_container">
                  <Label>{todo.description}</Label>
                  <div className="todo_btn">
                    <Button tooltipTitle="Highlight" click={() => focusFragment(todo)} icon="material-symbols:eye-tracking-rounded"></Button>
                    <Button tooltipTitle="Delete" click={() => deleteTodo(todo)} icon="material-symbols:delete-outline"></Button>
                  </div>
                </div>
              ))}
            </PanelSection>
            <PanelSection label='Properties' ref={propertyRef}>
            </PanelSection>
          </Panel>
      </div>
    </div>
  );
};
