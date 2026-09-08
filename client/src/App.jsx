import { useState } from 'react';
import './App.css';

export default function App() {
  // Mock data to visualize the interface
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Complete CMSC 128 Lab 1',
      dueDate: '2026-09-15T23:59',
      priority: 'High',
      tag: 'School',
      completed: false,
    },
    {
      id: '2',
      title: 'Buy Groceries',
      dueDate: '2026-09-10T15:00',
      priority: 'Low',
      tag: 'Personal',
      completed: true,
    },
  ]);

  return (
    <div className="app-container">
      <header>
        <h1>To-Do List</h1>
      </header>

      {/* ADD / EDIT TASK FORM */}
      <section className="card">
        <h2>Add New Task</h2>
        <form onSubmit={(e) => e.preventDefault()} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              placeholder="e.g., Submit Software Architecture Diagram"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueDate">Due Date & Time</label>
              <input
                type="datetime-local"
                id="dueDate"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select id="priority" defaultValue="Med">
                <option value="Low">Low</option>
                <option value="Med">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tag">Tag / Category</label>
              <select id="tag" defaultValue="School">
                <option value="School">School</option>
                <option value="Personal">Personal</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Add Task
          </button>
        </form>
      </section>

      {/* FILTER & SORT CONTROLS */}
      <section className="card controls-bar">
        <div className="control-group">
          <label htmlFor="sort">Sort By:</label>
          <select id="sort">
            <option value="createdAt">Date Added</option>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="tag">Tag</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="filterTag">Tag:</label>
          <select id="filterTag">
            <option value="All">All Tags</option>
            <option value="School">School</option>
            <option value="Personal">Personal</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="filterPriority">Priority:</label>
          <select id="filterPriority">
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Med">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </section>

      {/* TASK LIST DISPLAY */}
      <section className="card">
        <h2>Your Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`task-item ${task.completed ? 'completed' : ''}`}
              >
                <div className="task-main">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {}}
                  />
                  <span className="task-title">{task.title}</span>
                </div>

                <div className="task-details">
                  <span className="task-date">
                    Due: {new Date(task.dueDate).toLocaleString()}
                  </span>
                  <span className={`badge priority-${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <span className="badge tag">{task.tag}</span>
                </div>

                <div className="task-actions">
                  <button className="btn btn-secondary">Edit</button>
                  <button className="btn btn-danger">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}