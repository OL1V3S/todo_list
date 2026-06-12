// Get references to the page controls
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyMessage = document.getElementById("empty-message");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const filterButtons = document.querySelectorAll(".filter-btn");

let currentFilter = "all";
let tasks = loadTasks();
let isDragging = false;

// Display saved tasks when the page first loads.
renderTasks();

// Add a task with the button or Enter key.
taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const taskText = taskInput.value.trim();

    if (taskText === "") {
        taskInput.focus();
        return;
    }

    tasks.push({
        id: crypto.randomUUID(),
        text: taskText,
        completed: false
    });

    // Save the task, reset the input, and refresh the list.
    saveTasks();
    taskInput.value = "";
    taskInput.focus();
    renderTasks();
});

// Change which tasks are displayed.
filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach((filterButton) => {
            filterButton.classList.toggle("active", filterButton === button);
            filterButton.setAttribute("aria-pressed", filterButton === button);
        });

        renderTasks();
    });
});

// Remove every completed task.
clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
});

// Build and display the task list for the selected filter.
function renderTasks() {
    taskList.innerHTML = "";
    const visibleTasks = tasks.filter(isTaskVisible);

    visibleTasks.forEach((task) => {
        const li = document.createElement("li");
        li.dataset.id = task.id;
        li.draggable = true;
        li.classList.toggle("completed", task.completed);
        li.addEventListener("click", () => {
            if (!isDragging) toggleTask(task.id);
        });
        li.addEventListener("dragstart", (event) => {
            isDragging = true;
            li.classList.add("dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", task.id);
        });
        li.addEventListener("dragend", () => {
            li.classList.remove("dragging");
            saveVisibleTaskOrder();

            // Wait until the drag's click event finishes before enabling clicks.
            setTimeout(() => {
                isDragging = false;
            }, 0);
        });

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.text} as ${task.completed ? "active" : "complete"}`
        );
        checkbox.addEventListener("click", (event) => {
            event.stopPropagation();
        });
        checkbox.addEventListener("change", () => toggleTask(task.id));

        const text = document.createElement("span");
        text.className = "task-text";
        text.textContent = task.text;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.type = "button";
        deleteBtn.setAttribute("aria-label", `Delete ${task.text}`);
        deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            tasks = tasks.filter((savedTask) => savedTask.id !== task.id);
            saveTasks();
            renderTasks();
        });

        li.append(checkbox, text, deleteBtn);
        taskList.appendChild(li);
    });

    updateSummary(visibleTasks.length);
}

// Move the dragged row as the pointer crosses other tasks.
taskList.addEventListener("dragover", (event) => {
    event.preventDefault();
    const draggingTask = taskList.querySelector(".dragging");

    if (!draggingTask) return;

    const nextTask = getDragTarget(event.clientY);
    if (nextTask) {
        taskList.insertBefore(draggingTask, nextTask);
    } else {
        taskList.appendChild(draggingTask);
    }
});

// Find the closest task below the pointer.
function getDragTarget(pointerY) {
    const taskElements = [...taskList.querySelectorAll("li:not(.dragging)")];

    return taskElements.reduce((closest, taskElement) => {
        const box = taskElement.getBoundingClientRect();
        const offset = pointerY - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset, element: taskElement };
        }

        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

// Save the new visible order without moving filtered-out tasks.
function saveVisibleTaskOrder() {
    const visibleIds = [...taskList.children].map((item) => item.dataset.id);
    const reorderedTasks = visibleIds.map((id) => (
        tasks.find((task) => task.id === id)
    ));
    let visibleIndex = 0;

    tasks = tasks.map((task) => {
        if (!isTaskVisible(task)) return task;

        const reorderedTask = reorderedTasks[visibleIndex];
        visibleIndex += 1;
        return reorderedTask;
    });

    saveTasks();
}

// Check whether a task belongs to the selected filter.
function isTaskVisible(task) {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
}

// Switch a task between active and completed.
function toggleTask(taskId) {
    const task = tasks.find((savedTask) => savedTask.id === taskId);

    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    renderTasks();
}

// Update the task count, button state, and empty message.
function updateSummary(visibleTaskCount) {
    const activeCount = tasks.filter((task) => !task.completed).length;
    const completedCount = tasks.length - activeCount;

    taskCount.textContent = `${activeCount} ${activeCount === 1 ? "task" : "tasks"} left`;
    clearCompletedBtn.disabled = completedCount === 0;

    emptyMessage.hidden = visibleTaskCount > 0;
    if (tasks.length === 0) {
        emptyMessage.textContent = "No tasks yet. Add one above.";
    } else {
        emptyMessage.textContent = `No ${currentFilter} tasks.`;
    }
}

// Store the current tasks in the browser.
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Load saved tasks and recover safely from invalid data.
function loadTasks() {
    try {
        const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];

        // Add IDs to tasks saved by the earlier version of the app.
        return savedTasks.map((task) => ({
            id: task.id || crypto.randomUUID(),
            text: task.text,
            completed: Boolean(task.completed)
        }));
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}
