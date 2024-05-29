import * as OBC from "openbim-components"
import * as THREE from "three"
import { TodoCard } from "./src/TodoCard"

export type ToDoPriority = "Low" | "Medium" | "High"

export interface ToDo {
  description: string
  date: Date
  fragmentMap: OBC.FragmentIdMap
  camera: { position: THREE.Vector3, target: THREE.Vector3 }
  priority: ToDoPriority
}

export class TodoCreator extends OBC.Component<ToDo[]> implements OBC.UI, OBC.Disposable {
  static uuid = "abd7f95b-809f-46ca-a804-80cc5d2219ec"
  enabled = true
  onTodoCreated = new OBC.Event<ToDo>()
  uiElement = new OBC.UIElement<{
    activationBtn: OBC.Button
    todoList: OBC.FloatingWindow
  }>()
  private _components: OBC.Components
  private _list: ToDo[] = []
  
  constructor(components: OBC.Components, todoList: ToDo[]) {
    super(components)
    this._components = components
    components.tools.add(TodoCreator.uuid, this)
    this._list = todoList
    this.setUI()
  }

  async dispose() {
    this.uiElement.dispose()
    this._list = []
    this.enabled = false
  }

  async setup() {
    const highlighter = await this._components.tools.get(OBC.FragmentHighlighter)
    highlighter.add(`${TodoCreator.uuid}-priority-Low`, [new THREE.MeshStandardMaterial({ color: 0x59bc59 })])
    highlighter.add(`${TodoCreator.uuid}-priority-Normal`, [new THREE.MeshStandardMaterial({ color: 0x597cff })])
    highlighter.add(`${TodoCreator.uuid}-priority-High`, [new THREE.MeshStandardMaterial({ color: 0xff7676 })])
  }

  async addTodo(description: string, priority: ToDoPriority) {
    if (!this.enabled) { return }
    
    const camera = this._components.camera
    if (!(camera instanceof OBC.OrthoPerspectiveCamera)) {
      throw new Error("TodoCreator needs the OrthoPerspectiveCamera in order to work")
    }
    
    const position = new THREE.Vector3()
    camera.controls.getPosition(position)
    const target = new THREE.Vector3()
    camera.controls.getTarget(target)
    const todoCamera = { position, target }
    
    const highlighter = await this._components.tools.get(OBC.FragmentHighlighter)
    const todo: ToDo = {
      camera: todoCamera,
      description,
      date: new Date(),
      fragmentMap: highlighter.selection.select,
      priority
    }
    
    this._list.push(todo)
    
    const todoCard = new TodoCard(this._components)
    todoCard.description = todo.description
    todoCard.date = todo.date
    todoCard.onCardClick.add(() => {
      camera.controls.setLookAt(
        todo.camera.position.x,
        todo.camera.position.y,
        todo.camera.position.z,
        todo.camera.target.x,
        todo.camera.target.y,
        todo.camera.target.z,
        true
      )
      const fragmentMapLength = Object.keys(todo.fragmentMap).length
      if (fragmentMapLength === 0) {return}
      highlighter.highlightByID("select", todo.fragmentMap)
    })
    const todoList = this.uiElement.get("todoList")
    todoList.addChild(todoCard)
    
    todoCard.onCardDeleteClick.add(() => {
      this.deleteTodo(todo, todoCard)
    })

    todoCard.onCardEditClick.add(() => {
      this.editTodo(todo, todoCard)
    })
    
    this.onTodoCreated.trigger(todo)
  }

  editTodo(todo: ToDo, todoCard: TodoCard) {
    const form = new OBC.Modal(this._components)
    this._components.ui.add(form)
    form.title = "Edit ToDo"

    const descriptionInput = new OBC.TextArea(this._components)
    descriptionInput.label = "Description"
    descriptionInput.value = todo.description
    form.slots.content.addChild(descriptionInput)
    
    const priorityDropdown = new OBC.Dropdown(this._components)
    priorityDropdown.label = "Priority"
    priorityDropdown.addOption("Low", "Normal", "High")
    priorityDropdown.value = todo.priority
    form.slots.content.addChild(priorityDropdown)
    
    form.slots.content.get().style.padding = "20px"
    form.slots.content.get().style.display = "flex"
    form.slots.content.get().style.flexDirection = "column"
    form.slots.content.get().style.rowGap = "20px"

    form.onAccept.add(() => {
      const updateToDoList = this._list.filter((item) => {
        return (item!=todo)
      })
      this._list = updateToDoList
      todoCard.dispose()
      this.addTodo(descriptionInput.value, priorityDropdown.value as ToDoPriority)
      descriptionInput.value = ""
      form.visible = false
    })
    
    form.onCancel.add(() => form.visible = false)

    form.visible = true
  }
  
  deleteTodo(todo: ToDo, todoCard: TodoCard) {
    const updateToDoList = this._list.filter((toDo) => {
      return(toDo.description!=toDo.description)
    })
    this._list = updateToDoList
    todoCard.dispose()
  }

  private async setUI() {
    const activationBtn = new OBC.Button(this._components)
    activationBtn.materialIcon = "construction"
    
    const newTodoBtn = new OBC.Button(this._components, { name: "Create" })
    activationBtn.addChild(newTodoBtn)
    
    const form = new OBC.Modal(this._components)
    this._components.ui.add(form)
    form.title = "Create New ToDo"
    
    const descriptionInput = new OBC.TextArea(this._components)
    descriptionInput.label = "Description"
    form.slots.content.addChild(descriptionInput)
    
    const priorityDropdown = new OBC.Dropdown(this._components)
    priorityDropdown.label = "Priority"
    priorityDropdown.addOption("Low", "Normal", "High")
    priorityDropdown.value = "Normal"
    form.slots.content.addChild(priorityDropdown)
    
    form.slots.content.get().style.padding = "20px"
    form.slots.content.get().style.display = "flex"
    form.slots.content.get().style.flexDirection = "column"
    form.slots.content.get().style.rowGap = "20px"

    form.onAccept.add(() => {
      this.addTodo(descriptionInput.value, priorityDropdown.value as ToDoPriority)
      descriptionInput.value = ""
      form.visible = false
    })
    
    form.onCancel.add(() => form.visible = false)

    newTodoBtn.onClick.add(() => form.visible = true)
    
    const todoList = new OBC.FloatingWindow(this._components)
    this._components.ui.add(todoList)
    todoList.visible = false
    todoList.title = "To-Do List"

    const todoListToolbar = new OBC.SimpleUIComponent(this._components)
    todoList.addChild(todoListToolbar)

    const colorizeBtn = new OBC.Button(this._components)
    colorizeBtn.materialIcon = "format_color_fill"
    todoListToolbar.addChild(colorizeBtn)

    const highlighter = await this._components.tools.get(OBC.FragmentHighlighter)
    colorizeBtn.onClick.add(() => {
      colorizeBtn.active = !colorizeBtn.active
      if (colorizeBtn.active) {
        for (const todo of this._list) {
          const fragmentMapLength = Object.keys(todo.fragmentMap).length
          if (fragmentMapLength === 0) {return}
          highlighter.highlightByID(`${TodoCreator.uuid}-priority-${todo.priority}`, todo.fragmentMap)
        }
      } else {
        highlighter.clear(`${TodoCreator.uuid}-priority-Low`) 
        highlighter.clear(`${TodoCreator.uuid}-priority-Normal`) 
        highlighter.clear(`${TodoCreator.uuid}-priority-High`)
      }
    })

    const todoListBtn = new OBC.Button(this._components, { name: "List" })
    activationBtn.addChild(todoListBtn)
    todoListBtn.onClick.add(() => todoList.visible = !todoList.visible)
    
    this.uiElement.set({activationBtn, todoList})
  }

  get(): ToDo[] {
    return this._list
  }

}