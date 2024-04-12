import * as React from "react"
import * as Router from "react-router-dom"
import * as OBC from "openbim-components"
import { ProjectsManager } from "../classes/ProjectsManager"
import { IFCViewer, ViewerContext } from "./IFCViewer"
import { useState } from "react"
import { ToDo, TodoCreator } from "../bim-components/TodoCreator"

interface Props {
  projectsManager: ProjectsManager
}

export function ProjectDetailsPage(props: Props) {
  const routeParams = Router.useParams<{ id: string }>()
  const {viewer} = React.useContext(ViewerContext)
  const [toggle, setToggle] = useState<boolean>(true)
  const [todoList, setTodoList] = useState<ToDo[]>([])
  const [colorize, setColorize] = useState<boolean>(false)
  if (!routeParams.id) {return (<p>Project ID is needed to see this page</p>)}
  const project = props.projectsManager.getProject(routeParams.id)
  if (!project) {return (<p>The project with ID {routeParams.id} wasn't found.</p>)}
  
  function clickedTodoAdd(event: MouseEvent) {
    event.defaultPrevented

    
  }

  const addTodo = () => {
    setTodoList([...todoList])
  }

  async function clickedTodo(event: MouseEvent, todo: ToDo) {
    event.defaultPrevented
    if(!viewer) {return}
    const camera = viewer.camera
    if (!(camera instanceof OBC.OrthoPerspectiveCamera)) {
      throw new Error("TodoCreator needs the OrthoPerspectiveCamera in order to work")
    }
    camera.controls.setLookAt(
      todo.camera.position.x,
      todo.camera.position.y,
      todo.camera.position.z,
      todo.camera.target.x,
      todo.camera.target.y,
      todo.camera.target.z,
      true
    )
    const highlighter = await viewer.tools.get(OBC.FragmentHighlighter)
    const fragmentMapLength = Object.keys(todo.fragmentMap).length
    if (fragmentMapLength === 0) {return}
    highlighter.highlightByID("select", todo.fragmentMap)
  }

  async function clickedColorize(event: MouseEvent) {
    event.defaultPrevented
    if(!viewer) {return}
    const highlighter = await viewer.tools.get(OBC.FragmentHighlighter)
    if(colorize) {
      setColorize(!colorize)
      highlighter.clear(`${TodoCreator.uuid}-priority-Low`) 
      highlighter.clear(`${TodoCreator.uuid}-priority-Normal`) 
      highlighter.clear(`${TodoCreator.uuid}-priority-High`)
    } else {
      setColorize(!colorize)
      for (const todo of todoList) {
        const fragmentMapLength = Object.keys(todo.fragmentMap).length
        if (fragmentMapLength === 0) {return}
        highlighter.highlightByID(`${TodoCreator.uuid}-priority-${todo.priority}`, todo.fragmentMap)
      }
    }
  }

  return (
    <div className="page" id="project-details">
      <header>
        <div>
          <h2 data-project-info="name">{project.name}</h2>
          <p style={{ color: "#969696" }}>{project.description}</p>
        </div>
      </header>
      <div className={toggle ? "main-page-content" : "main-page-content-info-hide"}>
        <div className="toggle" onClick={() => setToggle(!toggle)}>
          {toggle ? 
            <span className="material-icons-round">arrow_back_ios</span>
          : <span className="material-icons-round">arrow_forward_ios</span> }
        </div>
        {toggle ? 
        <div style={{ display: "flex", flexDirection: "column", rowGap: 30, height: "100%" }}>
        <div className="dashboard-card" style={{ padding: "30px 0"}}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0px 30px",
              marginBottom: 30
            }}
          >
            <p
              style={{
                fontSize: 20,
                backgroundColor: "#ca8134",
                aspectRatio: 1,
                borderRadius: "100%",
                padding: 12
              }}
            >
              HC
            </p>
            <button className="btn-secondary">
              <p style={{ width: "100%" }}>Edit</p>
            </button>
          </div>
          <div style={{ padding: "0 30px" }}>
            <div>
              <h5>{project.name}</h5>
              <p>{project.description}</p>
            </div>
            <div
              style={{
                display: "flex",
                columnGap: 30,
                padding: "30px 0px",
                justifyContent: "space-between"
              }}
            >
              <div>
                <p style={{ color: "#969696", fontSize: "var(--font-sm)" }}>
                  Status
                </p>
                <p>{project.status}</p>
              </div>
              <div>
                <p style={{ color: "#969696", fontSize: "var(--font-sm)" }}>
                  Cost
                </p>
                <p>${project.cost}</p>
              </div>
              <div>
                <p style={{ color: "#969696", fontSize: "var(--font-sm)" }}>
                  Role
                </p>
                <p>{project.userRole}</p>
              </div>
              <div>
                <p style={{ color: "#969696", fontSize: "var(--font-sm)" }}>
                  Finish Date
                </p>
                <p>{project.finishDate.toDateString()}</p>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#404040",
                borderRadius: 9999,
                overflow: "auto"
              }}
            >
              <div
                style={{
                  width: `${project.progress * 100}%`,
                  backgroundColor: "green",
                  padding: "4px 0",
                  textAlign: "center"
                }}
              >
                {project.progress * 100}%
              </div>
            </div>
          </div>
        </div>
        <div className="dashboard-card" style={{ flexGrow: 1}}>
          <div
            style={{
              padding: "20px 30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "20%"
            }}
          >
            <h4>To-Do</h4>
            <div onClick={e => clickedColorize(e)}>
              <span className={colorize ? "material-icons-round selected" : "material-icons-round"} >format_color_fill</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "end",
                columnGap: 20
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", columnGap: 10 }}
              >
                <span className="material-icons-round">search</span>
                <input
                  type="text"
                  placeholder="Search To-Do's by name"
                  style={{ width: "100%" }}
                />
              </div>
              <span className="material-icons-round" onClick={(event) => clickedTodoAdd(event)}>add</span>
            </div>
          </div>
          <div className="todo-card-container">
            {todoList.map((todo:ToDo, index:number) => {
              return (<div className="todo-item" key={index} onClick={(e) => clickedTodo(e, todo)}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div
                  style={{ display: "flex", columnGap: 15, alignItems: "center" }}
                >
                  <span
                    className="material-icons-round"
                    style={{
                      padding: 10,
                      backgroundColor: "#686868",
                      borderRadius: 10
                    }}
                  >
                    construction
                  </span>
                  <p>{todo.description}</p>
                </div>
                <p style={{ marginLeft: 10 }}>{todo.date.toDateString()}</p>
              </div>
            </div>)
            })}
          </div>
        </div>
      </div>
        : 
      <></>}
      <IFCViewer todoList={todoList} addTodo={addTodo}/>
      </div>
    </div>
  )
}
