import React, { useEffect, useState } from "react";
import "./App.css"; // Assume CSS styles are defined here
import "./tasks.css";
import { DatePicker, Input, Button, Tabs, Table, Tag, Spin } from "antd";
import dayjs from "dayjs";
const { TabPane } = Tabs;
const TASK_BUCKETS = {
  ongoing: "Ongoing",
  success: "Completed On Time",
  failure: "Failed",
};

const TaskCard = ({ task, onComplete, onDelete }) => {
  const deadline = new Date(task.deadline);
  const isPastDeadline = deadline < new Date();
  const timeLeft = Math.max(0, deadline - new Date());
  const remaining = `${Math.floor(timeLeft / 60000)} min left`;

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <p className="deadline">Deadline: {deadline.toLocaleString()}</p>
      <p className="time-status">
        {isPastDeadline ? "Deadline passed" : remaining}
      </p>
      {!task.status && (
        <button onClick={() => onComplete(task.id)}>Mark as Complete</button>
      )}
      <button onClick={() => onDelete(task.id)}>Delete</button>
    </div>
  );
};

function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
  });
  const getColumns = (onComplete, onDelete) => [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Deadline",
      dataIndex: "deadline",
      key: "deadline",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const color =
          status === "success"
            ? "green"
            : status === "failure"
            ? "red"
            : "blue";
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, task) => (
        <>
          {task.status !== "success" && task.status !== "failure" && (
            <Button type="link" onClick={() => onComplete(task.id)}>
              Complete
            </Button>
          )}
          <Button danger type="link" onClick={() => onDelete(task.id)}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  const formatLocalTime = (utcDateString) => {
    const date = new Date(utcDateString);
    return date.toLocaleString(); // Formats to local time zone
  };
  const fetchTasks = async () => {
    try {
      setGridLoading(true);
      const res = await fetch("http://localhost:8000/api/tasks");
      const data = await res.json();
      setTasks(
        data.map((task) => ({
          ...task,
          deadline: formatLocalTime(task.deadline), // Convert to local time
        }))
      );
      setTasks(data);
    } catch (e) {
      console.error("error fetching data", e);
    } finally {
      setGridLoading(false);
    }
  };

  const createTask = async () => {
    try {
      setLoading(true);
      await fetch("http://localhost:8000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      setNewTask({ title: "", description: "", deadline: "" });
      fetchTasks();
    } catch (e) {
      console.error("error creating task", e);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (id) => {
    try {
      setGridLoading(true);
      await fetch(`http://localhost:8000/api/tasks/${id}/complete`, {
        method: "POST",
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };
  const deleteTask = async (id) => {
    try {
      setGridLoading(true);
      await fetch(`http://localhost:8000/api/tasks/${id}/delete`, {
        method: "DELETE",
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  const categorized = {
    ongoing: [],
    success: [],
    failure: [],
  };

  tasks.forEach((task) => categorized[task.status || "ongoing"].push(task));

  return (
    <div className="task-board">
      <div className="task-board-header">ToDo App</div>
      <div className="task-board-body">
        <div className="new-task-form">
          <h2>Add New Task</h2>

          <div className="input-field-div">
            <label>Title</label>
            <Input
              placeholder="Title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
          </div>
          <div className="input-field-div">
            <label>Description</label>
            <Input
              placeholder="Description"
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
          </div>
          <div className="input-field-div">
            <label>Deadline</label>
            <DatePicker
              showTime
              format="DD-MM-YYYY HH:mm"
              value={newTask.deadline ? dayjs(newTask.deadline) : null}
              onChange={(date) => {
                const utcDeadline = date.toISOString();
                setNewTask({ ...newTask, deadline: utcDeadline });
              }}
              style={{ width: "100%" }}
            />
          </div>
          <div className="button-wrapper">
            <Button
              style={{ width: "50%" }}
              type="primary"
              onClick={createTask}
              loading={loading}
            >
              Add Task
            </Button>
          </div>
        </div>

        <div className="task-tab-container">
          <Tabs defaultActiveKey="ongoing" centered size="large">
            {Object.entries(TASK_BUCKETS).map(([key, label]) => (
              <TabPane tab={label} key={key}>
                {categorized[key].length ? (
                  <div style={{ overflowX: "auto" }}>
                    {gridLoading ? (
                      <Spin />
                    ) : (
                      <Table
                        dataSource={categorized[key]}
                        columns={getColumns(markComplete, deleteTask)}
                        rowKey="id"
                        pagination={false}
                      />
                    )}
                  </div>
                ) : (
                  <p className="empty-message">No tasks in this category.</p>
                )}
              </TabPane>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default TaskBoard;
