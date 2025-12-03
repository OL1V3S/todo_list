// Get references to the input, button, and task list
const taskInput = document.getElementById("task-input");
const addTaskBtn = document.getElementById("add-task-btn");
const taskList = document.getElementById("task-list");

// Load existing tasks from localStorage
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
// Render tasks when page loads
renderTasks();


// Make "add" button actually do something when clicked
addTaskBtn.addEventListener("click", () => {
    const taskText = taskInput.value.trim();

    if (taskText === "") { // "===" checks value AND type
        alert("No task entered >:(");
        return;
    }

    // Add new task to array
    tasks.push({text: taskText, completed: false});

    // Save to localStorage
    localStorage.setItem("tasks", JSON.stringify(tasks));

    // Clear input box
    taskInput.value="";

    // Re-render updated list
    renderTasks();
});

function renderTasks() {
    // Clear current list to not duplicate tasks
    taskList.innerHTML = "";

    // Looping through every task
    tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.textContent = task.text;

        // If task is completed, style different
        if(task.completed) {
            li.classList.add("completed");
        }

        // Complete task when clicked
        li.addEventListener("click", () => {
            tasks[index].completed = !tasks[index].completed;
            localStorage.setItem("tasks", JSON.stringify(tasks));
            renderTasks();
        });

        // Create delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Stops click from also marking task completed
            tasks.splice(index,1); // Remove task from array
            localStorage.setItem("tasks", JSON.stringify(tasks));
            renderTasks();
        });

        // Add delete button to list item
        li.appendChild(deleteBtn); // Add inside li so it appears next to task

        // Add list item to task list
        taskList.appendChild(li);

    });

}

// ========== FALLING SNOW ==========
const snowContainer = document.querySelector('.snow');

for (let i = 0; i < 70; i++) {
  const flake = document.createElement('span');
  flake.style.left = Math.random() * 100 + "vw";
  flake.style.animationDuration = (3 + Math.random() * 5) + "s";
  flake.style.opacity = Math.random();
  flake.style.width = flake.style.height = (5 + Math.random() * 10) + "px";
  snowContainer.appendChild(flake);
}

