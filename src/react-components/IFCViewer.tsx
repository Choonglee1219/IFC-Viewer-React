import * as React from "react"
import * as THREE from "three"
import * as OBC from "openbim-components"
import * as BUI from "@thatopen/ui" 
import { FragmentsGroup } from "bim-fragment"
import { TodoCreator, ToDo } from "../bim-components/TodoCreator"
import { SimpleQto } from "../bim-components/SimpleQto"
import { GUI } from 'dat.gui'
import { IProject } from "../classes/Project"

interface IViewerContext {
  viewer: OBC.Components | null
  setViewer: (viewer: OBC.Components | null) => void
}

export const ViewerContext = React.createContext<IViewerContext>({
  viewer: null,
  setViewer: () => {}
})

export function ViewerProvider(props: {children: React.ReactNode}) {
  const [viewer, setViewer] = React.useState<OBC.Components | null>(null)
  return (
    <ViewerContext.Provider value={{ viewer, setViewer }}>
      {props.children}
    </ViewerContext.Provider>
  )
}

interface Iprops {
  todoList: ToDo[],
  addTodo: (todo:ToDo) => void,
  project: IProject
}

export function IFCViewer(prop : Iprops) {
  const { setViewer } = React.useContext(ViewerContext)
  const ref = React.useRef<HTMLElement>(null)
  let viewer: OBC.Components
  const createViewer = async () => {
    viewer = new OBC.Components()
    setViewer(viewer)

    const sceneComponent = new OBC.SimpleScene(viewer)
    sceneComponent.setup()
    viewer.scene = sceneComponent
    const scene = sceneComponent.get()
    scene.background = null

    const viewerContainer = ref.current as HTMLElement
    const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
    viewer.renderer = rendererComponent

    const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
    viewer.camera = cameraComponent

    const raycasterComponent = new OBC.SimpleRaycaster(viewer)
    viewer.raycaster = raycasterComponent

    viewer.init()
    cameraComponent.updateAspect()
    rendererComponent.postproduction.enabled = true

    const fragmentManager = new OBC.FragmentManager(viewer)
    function exportFragments(model: FragmentsGroup) {
      const fragmentBinary = fragmentManager.export(model)
      const blob = new Blob([fragmentBinary])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${model.name.replace(".ifc", "")}.frag`
      a.click()
      URL.revokeObjectURL(url)
    }

    const ifcLoader = new OBC.FragmentIfcLoader(viewer)
    ifcLoader.settings.wasm = {
      path: "https://unpkg.com/web-ifc@0.0.43/",
      absolute: true
    }

    const highlighter = new OBC.FragmentHighlighter(viewer)
    highlighter.setup()

    const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer)
    highlighter.events.select.onClear.add(() => {
      propertiesProcessor.cleanPropertiesList()
    })

    const classifier = new OBC.FragmentClassifier(viewer)

    const classificationWindow = new OBC.FloatingWindow(viewer)
    classificationWindow.visible = false
    viewer.ui.add(classificationWindow)
    classificationWindow.title = "Model Groups"

    const classificationsBtn = new OBC.Button(viewer)
    classificationsBtn.materialIcon = "account_tree"
    classificationsBtn.onClick.add(() => {
      classificationWindow.visible = !classificationWindow.visible
      classificationsBtn.active = classificationWindow.visible
    })

    async function createModelTree() {
      const fragmentTree = new OBC.FragmentTree(viewer)
      await fragmentTree.init()
      await fragmentTree.update(["storeys", "entities"])
      fragmentTree.onHovered.add((fragmentMap) => {
        highlighter.highlightByID("hover", fragmentMap)
      })
      fragmentTree.onSelected.add((fragmentMap) => {
        highlighter.highlightByID("select", fragmentMap)
      })
      const tree = fragmentTree.get().uiElement.get("tree")
      return tree
    }

    const hider = new OBC.FragmentHider(viewer);
    await hider.loadCached();

    const culler = new OBC.ScreenCuller(viewer)
    cameraComponent.controls.addEventListener("sleep", () => {
      culler.needsUpdate = true
    })

    async function onModelLoaded(model: FragmentsGroup) {
      highlighter.update()
      for (const fragment of model.items) {culler.add(fragment.mesh)}
      culler.needsUpdate = true

      try {
        classifier.byStorey(model)
        classifier.byEntity(model)
        classifier.byModel(model.name, model)
        const tree = await createModelTree()
        await classificationWindow.slots.content.dispose(true)
        classificationWindow.addChild(tree)
        
        const classifications = classifier.get()
        const storeys = {}
        const storeyNames = Object.keys(classifications.storeys)
        for (const name of storeyNames) {
          storeys[name] = true
        }
        const classes = {}
        const classNames = Object.keys(classifications.entities)
        for (const name of classNames) {
          classes[name] = true
        }


        // gui.js 대시 ThatOpen/ui를 사용하여 hider 표현함
        BUI.Manager.init();
        const panel = BUI.Component.create<BUI.PanelSection>(() => {
          return BUI.html`
            <bim-panel active label="Hider" 
              style="position: fixed; top: 5px; right: 5px; background: #151515;">
              
              <bim-panel-section fixed name="Floors" style="padding-top: 10px;">
              </bim-panel-section>
              
              <bim-panel-section fixed name="Categories" style="padding-top: 10px;">
              </bim-panel-section>
              
            </bim-panel>
          `;
        });

        document.body.append(panel);

        const floorSection = panel.querySelector(
          "bim-panel-section[name='Floors']",
        ) as BUI.PanelSection;

        const categorySection = panel.querySelector(
          "bim-panel-section[name='Categories']",
        ) as BUI.PanelSection;

        for (const name in storeys) {
          const panel = BUI.Component.create<BUI.Checkbox>(() => {
            return BUI.html`
              <bim-checkbox checked label="${name}"
                @change="${async ({ target }: { target: BUI.Checkbox }) => {
                  const found = await classifier.find({ storeys: [name] });
                  hider.set(target.value, found);
                }}">
              </bim-checkbox>
            `;
          });
          floorSection.append(panel);
        }

        for (const name in classes) {
          const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
            return BUI.html`
              <bim-checkbox checked label="${name}"
                @change="${async ({ target }: { target: BUI.Checkbox }) => {
                  const found = await classifier.find({ entities: [name] });
                  hider.set(target.value, found);
                }}">
              </bim-checkbox>
            `;
          });
          categorySection.append(checkbox);
        }

        // const gui = new GUI()
        // const storeysGui = gui.addFolder("Storeys");
        // for (const name in storeys) {
        //   storeysGui.add(storeys, name).onChange(async (visible) => {
        //     const found = await classifier.find({ storeys: [name] });
        //     hider.set(visible, found);
        //   });
        // }
        // const entitiesGui = gui.addFolder("Classes");
        // for (const name in classes) {
        //   entitiesGui.add(classes, name).onChange(async (visible) => {
        //     const found = await classifier.find({ entities: [name] });
        //     hider.set(visible, found);
        //   });
        // }



        propertiesProcessor.process(model)
        highlighter.events.select.onHighlight.add((fragmentMap) => {
          const expressID = [...Object.values(fragmentMap)[0]][0]
          propertiesProcessor.renderProperties(model, Number(expressID))
        })
      } catch (error) {
        alert(error)
      }
    }
    
    ifcLoader.onIfcLoaded.add(async (model) => {
      // exportFragments(model)
      onModelLoaded(model)
    })

    fragmentManager.onFragmentsLoaded.add((model) => {
      // model.properties = {} //Get this from a JSON file exported from the IFC first load!
      onModelLoaded(model)
    })

    const importFragmentBtn = new OBC.Button(viewer)
    importFragmentBtn.materialIcon = "upload"
    importFragmentBtn.tooltip = "Load FRAG"

    importFragmentBtn.onClick.add(() => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.frag'
      const reader = new FileReader()
      reader.addEventListener("load", async () => {
        const binary = reader.result
        if (!(binary instanceof ArrayBuffer)) { return }
        const fragmentBinary = new Uint8Array(binary)
        await fragmentManager.load(fragmentBinary)
      })
      input.addEventListener('change', () => {
        const filesList = input.files
        if (!filesList) { return }
        reader.readAsArrayBuffer(filesList[0])
      })
      input.click()
    })

    const propertiesFinder = new OBC.IfcPropertiesFinder(viewer)
    await propertiesFinder.init()
    propertiesFinder.onFound.add((fragmentIdMap) => {
      highlighter.highlightByID("select", fragmentIdMap)
    })

    const todoCreator = new TodoCreator(viewer, prop.todoList)
    await todoCreator.setup()

    const simpleQto = new SimpleQto(viewer)
    await simpleQto.setup()

    const toolbar = new OBC.Toolbar(viewer)
    toolbar.addChild(
      ifcLoader.uiElement.get("main"),
      importFragmentBtn,
      classificationsBtn,
      propertiesProcessor.uiElement.get("main"),
      todoCreator.uiElement.get("activationBtn"),
      simpleQto.uiElement.get("activationBtn"),
      fragmentManager.uiElement.get("main"),
      propertiesFinder.uiElement.get("main"),
      hider.uiElement.get("main"),
    )
    viewer.ui.addToolbar(toolbar)
    //default project load
    const name:string = prop.project.name
    const model = await ifcLoader.load(prop.project.ifc_data, name);
    scene.add(model)
  }

  React.useEffect(() => {
    createViewer()
    //resize event observe
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        window.dispatchEvent(new Event('resize'))
      }
    })
    observer.observe(ref.current as Element)
    return () => {
      viewer.dispose()
      setViewer(null)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      id="viewer-container"
      className="dashboard-card"
      ref={ref}
      style={{ minWidth: 0, position: "relative" }}
    />
  )
}