// initialize the AWS data handler
AWSHandler.initialize();

// intialize all the screen objects
UIHandler.ManageExpensesUI.initializeUI();
UIHandler.NewExpenseUI.initializeUI();
UIHandler.EditExpenseUI.initializeUI();

// load into the manage expenses screen
UIHandler.switchUI(UIHandler.ManageExpensesUI);


// event listeners and simple form validation

// top bar navigation
document.getElementById("manageExpensesRadio").addEventListener("click", () => {
    UIHandler.switchUI(UIHandler.ManageExpensesUI);
});
document.getElementById("newExpenseRadio").addEventListener("click", () => {
    UIHandler.switchUI(UIHandler.NewExpenseUI);
});

// validate the new expenses UI and submit if passing
UIHandler.NewExpenseUI.submitButton.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.getElementById("newForm").checkValidity()) {
        if (UIHandler.NewExpenseUI.imageField.value) { // if we're uploading a file
            if (UIHandler.NewExpenseUI.imageField.files[0].size > 3145728) { //if size is greater than 3MB
                UIHandler.NewExpenseUI.imageField.setCustomValidity("Images must be less than 3MB in size.")
                return false;
            }
        }
        UIHandler.NewExpenseUI.submitNewExpense();
        return true;
    }

    document.getElementById("newForm").reportValidity();
});

// validate the edit expenses UI and submit if passing
UIHandler.EditExpenseUI.submitButton.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.getElementById("editForm").checkValidity()) {
        UIHandler.EditExpenseUI.submitEditExpense();
        return true;
    }

    document.getElementById("editForm").reportValidity();
});

// trigger filters when the search button, type field, or sort field are interacted with
UIHandler.ManageExpensesUI.searchButton.addEventListener("click", () => {
    UIHandler.ManageExpensesUI.submitFilterQuery();
    UIHandler.ManageExpensesUI.drawRecords();
})

UIHandler.ManageExpensesUI.typeField.addEventListener("change", () => {
    UIHandler.ManageExpensesUI.submitFilterQuery();
    UIHandler.ManageExpensesUI.drawRecords();
});

UIHandler.ManageExpensesUI.sortField.addEventListener("change", () => {
    UIHandler.ManageExpensesUI.submitFilterQuery();
    UIHandler.ManageExpensesUI.drawRecords();
});

// filter by time
document.getElementById("manageTimeSubmit").addEventListener("click", (e) => {
    e.preventDefault();
    UIHandler.ManageExpensesUI.submitFilterQuery();
    UIHandler.ManageExpensesUI.drawRecords();
    document.getElementById("manageTime").textContent = "Custom Time"
});

// reset the time filter
document.getElementById("manageTimeReset").addEventListener("click", (e) => {
    e.preventDefault();
    UIHandler.ManageExpensesUI.minTimeField.value = "";
    UIHandler.ManageExpensesUI.maxTimeField.value = "";
    UIHandler.ManageExpensesUI.submitFilterQuery();
    UIHandler.ManageExpensesUI.drawRecords();
    document.getElementById("manageTime").textContent = "Any Time"
});

// filter by amount
document.getElementById("manageAmountSubmit").addEventListener("click", (e) => {
    e.preventDefault();
    if (document.getElementById("manageAmountForm").checkValidity()) {
        UIHandler.ManageExpensesUI.submitFilterQuery();
        UIHandler.ManageExpensesUI.drawRecords();
        document.getElementById("manageAmount").textContent = "Custom Amount"
        return true;
    }

    document.getElementById("manageAmountForm").reportValidity();
});

// reset the amount field
document.getElementById("manageAmountReset").addEventListener("click", (e) => {
    e.preventDefault();
    UIHandler.ManageExpensesUI.minAmountField.value = "";
    UIHandler.ManageExpensesUI.maxAmountField.value = "";
    UIHandler.ManageExpensesUI.submitFilterQuery();
    UIHandler.ManageExpensesUI.drawRecords();
    document.getElementById("manageAmount").textContent = "Any Amount"
});

// export csv buttons
UIHandler.ManageExpensesUI.fullCSVButton.addEventListener("click", () => {
    LocalDataHandler.exportFullCSV();
});

UIHandler.ManageExpensesUI.threeCSVButton.addEventListener("click", () => {
    console.log("here")
    LocalDataHandler.exportThreeColumnCSV();
});