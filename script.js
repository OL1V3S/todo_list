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
let editingId = null;
let lastPointerType = "mouse";
let touchDrag = null;

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
        li.draggable = task.id !== editingId;
        li.classList.toggle("completed", task.completed);
        li.addEventListener("click", () => {
            if (!isDragging) toggleTask(task.id);
        });
        li.addEventListener("pointerdown", (event) => startTouchDrag(event, li));
        li.addEventListener("contextmenu", (event) => {
            if (lastPointerType === "touch") event.preventDefault();
        });
        li.addEventListener("dragstart", (event) => {
            // Touch uses the long-press drag below instead of the native drag.
            if (lastPointerType === "touch") {
                event.preventDefault();
                return;
            }

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

        let text;
        if (task.id === editingId) {
            // Swap the label for an input while this task is being edited.
            text = document.createElement("input");
            text.type = "text";
            text.className = "task-edit-input";
            text.value = task.text;
            text.maxLength = 120;
            text.setAttribute("aria-label", "Edit task");
            text.addEventListener("click", (event) => event.stopPropagation());
            text.addEventListener("keydown", (event) => {
                if (event.key === "Enter") finishEdit(true, text.value);
                if (event.key === "Escape") finishEdit(false);
            });
            text.addEventListener("blur", () => finishEdit(true, text.value));
        } else {
            text = document.createElement("span");
            text.className = "task-text";
            text.textContent = task.text;
        }

        const editBtn = createIconButton("\u270E", `Edit ${task.text}`, () => {
            editingId = task.id;
            renderTasks();
        });

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

        const actions = document.createElement("div");
        actions.className = "task-actions";
        actions.append(editBtn, deleteBtn);

        li.append(checkbox, text, actions);
        taskList.appendChild(li);

        if (task.id === editingId) {
            text.focus();
            text.select();
        }
    });

    updateSummary(visibleTasks.length);
}

// Build a small icon button that does not toggle the task row.
function createIconButton(label, ariaLabel, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-btn";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        onClick();
    });
    return button;
}

// Finish editing a task, keeping the old text if the new one is empty.
function finishEdit(shouldSave, newText = "") {
    if (editingId === null) return;

    const task = tasks.find((savedTask) => savedTask.id === editingId);
    editingId = null;

    if (shouldSave && task && newText.trim() !== "") {
        task.text = newText.trim();
        saveTasks();
    }

    renderTasks();
}

// Hold a task for a moment on a touch screen, then drag it up or down.
function startTouchDrag(event, li) {
    lastPointerType = event.pointerType;

    if (event.pointerType !== "touch" || editingId !== null) return;
    if (event.target.closest("button, input")) return;

    const state = {
        li,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        timer: null
    };

    state.timer = setTimeout(() => {
        state.active = true;
        isDragging = true;
        li.classList.add("dragging");
        if (navigator.vibrate) navigator.vibrate(15);
    }, 350);

    touchDrag = state;
}

taskList.addEventListener("pointermove", (event) => {
    if (!touchDrag) return;

    if (!touchDrag.active) {
        // Moving before the hold finishes means the user is scrolling.
        const moved = Math.hypot(event.clientX - touchDrag.startX, event.clientY - touchDrag.startY);
        if (moved > 8) {
            clearTimeout(touchDrag.timer);
            touchDrag = null;
        }
        return;
    }

    const nextTask = getDragTarget(event.clientY);
    if (nextTask) {
        taskList.insertBefore(touchDrag.li, nextTask);
    } else {
        taskList.appendChild(touchDrag.li);
    }
});

function endTouchDrag() {
    if (!touchDrag) return;

    clearTimeout(touchDrag.timer);
    const wasActive = touchDrag.active;
    touchDrag.li.classList.remove("dragging");
    touchDrag = null;

    if (wasActive) {
        saveVisibleTaskOrder();

        // Wait until the release's click event finishes before enabling clicks.
        setTimeout(() => {
            isDragging = false;
        }, 0);
    }
}

taskList.addEventListener("pointerup", endTouchDrag);
taskList.addEventListener("pointercancel", endTouchDrag);

// Stop the page from scrolling while a task is being dragged.
taskList.addEventListener("touchmove", (event) => {
    if (touchDrag && touchDrag.active) event.preventDefault();
}, { passive: false });

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


// Scatter pixel leaves that fall behind the app
const leavesLayer = document.querySelector(".leaves");
const leafColors = ["#e8743b", "#f4b860", "#b8431f", "#3f86d8", "#7a8a3a"];

if (leavesLayer) {
    for (let i = 0; i < 22; i++) {
        const leaf = document.createElement("span");
        leaf.className = "leaf";
        leaf.style.left = `${Math.random() * 100}%`;
        leaf.style.setProperty("--size", `${12 + Math.floor(Math.random() * 3) * 4}px`);
        leaf.style.setProperty("--leaf-color", leafColors[i % leafColors.length]);
        leaf.style.setProperty("--fall", `${9 + Math.random() * 9}s`);
        leaf.style.setProperty("--sway", `${2.5 + Math.random() * 2}s`);
        leaf.style.setProperty("--tilt", `${Math.floor(Math.random() * 90) - 45}deg`);
        leaf.style.setProperty("--delay", `${-Math.random() * 18}s`);
        leavesLayer.appendChild(leaf);
    }
}
