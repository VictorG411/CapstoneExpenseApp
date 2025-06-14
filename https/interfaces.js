// handles switching between the different application screens
UIHandler = new class {
    currentUI; // holds the currently displayed UI
    ManageExpensesUI;
    NewExpenseUI;
    EditExpenseUI;

    switchUI(targetUI) {
        // if a UI is currently set, lock and disable it
        if (this.currentUI) {
            this.currentUI.lockUI();
            this.currentUI.setEnabled(false);
        }

        // set the new UI, unlock and enable it
        this.currentUI = targetUI;

        // clear the UI then set it to the new UI
        var UIContent = document.getElementById("UIContent");
        UIContent.innerHTML = "";
        UIContent.appendChild(this.currentUI.getContainerNode());

        // reset, unlock, and enable the new UI
        this.currentUI.resetUI();
        this.currentUI.unlockUI();
        this.currentUI.setEnabled(true);
    }

    // draw the username in the top right corner of the screen
    drawUsername() {
        document.getElementById("usernameLabel").textContent = "Welcome back, " + AWSHandler.loggedInUsername + "!";
    }
}

UIHandler.ManageExpensesUI = new class {
    enabled = false;
    containerNode; // reference to the HTML elements for this screen so it can move in and out of the DOM
    // html element references
    sortField;
    minTimeField;
    maxTimeField;
    typeField;
    queryField;
    minAmountField;
    maxAmountField;
    searchButton;
    fullCSVButton;
    threeCSVButton;
    recordContainer;

    initializeUI() {
        // initialize all of our html elements
        this.sortField = document.getElementById("manageSort");
        this.minTimeField = document.getElementById("manageMinTime");
        this.maxTimeField = document.getElementById("manageMaxTime");
        this.typeField = document.getElementById("manageType");
        this.queryField = document.getElementById("manageQuery");
        this.minAmountField = document.getElementById("manageMinAmount");
        this.maxAmountField = document.getElementById("manageMaxAmount");
        this.recordContainer = document.getElementById("manageRecords");
        this.searchButton = document.getElementById("manageSearch");
        this.threeCSVButton = document.getElementById("manageThreeCSV");
        this.fullCSVButton = document.getElementById("manageFullCSV");

        // pop this section out of the DOM and store it
        this.containerNode = document.getElementById("UIContent").removeChild(document.getElementById("manageExpenses"))

    }

    getContainerNode() {
        return this.containerNode;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        document.getElementById("manageExpensesRadio").checked = enabled;
    }

    unlockUI() {
        this.sortField.disabled = false;
        this.minTimeField.disabled = false;
        this.maxTimeField.disabled = false;
        this.typeField.disabled = false;
        this.queryField.disabled = false;
        this.minAmountField.disabled = false;
        this.maxAmountField.disabled = false;
        this.searchButton.disabled = false;
    }

    lockUI() {
        this.sortField.disabled = true;
        this.minTimeField.disabled = true;
        this.maxTimeField.disabled = true;
        this.typeField.disabled = true;
        this.queryField.disabled = true;
        this.minAmountField.disabled = true;
        this.maxAmountField.disabled = true;
        this.searchButton.disabled = true;
    }

    // reset this UI for when it is loaded fresh
    async resetUI() {
        await LocalDataHandler.loadData();

        this.queryField.value = "";
        this.minTimeField.value = "";
        this.maxTimeField.value = "";
        this.typeField.value = "Any Type";
        this.minAmountField.value = "";
        this.maxAmountField.value = "";
        this.sortField.value = "Time, Descending";

        this.submitFilterQuery();
        this.drawRecords();
    }

    // draw the record list based on the contents of LocalDataHandler.filteredData
    drawRecords() {
        // dont draw records if there are none
        if (LocalDataHandler.filteredData.length === 0) {
            this.recordContainer.innerHTML = '<h5 class="text-center">There are no records to display.</h5>';
            return true;
        }

        // clear the current record list
        this.recordContainer.innerHTML = "";

        //console.log(LocalDataHandler.filteredData);

        // for formatting the currency amounts later
        var usd = new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"});

        // loop through all records and generate HTML to display each of them
        for (const rec of LocalDataHandler.filteredData) {
            var recordRow = document.createElement("div");
            recordRow.setAttribute("class", "card mb-1");

            recordRow.innerHTML = 
                '<div class="card-body">' +
                    '<div class="row transaction-row m-0">' +
                        '<div class="col-md-3 p-0">' +
                            '<div class="transaction-section fw-bold h-100">' + rec[1].fullName + '</div>' +
                        '</div>' +
                        '<div class="col-md-2 p-0">' +
                            '<div class="transaction-section h-100">' + usd.format(rec[1].amount) + '</div>' +
                        '</div>' +
                        '<div class="col-md-1 p-0">' +
                            '<div class="transaction-section h-100">' + rec[1].type + '</div>' +
                        '</div>' +
                        '<div class="col-md-5 p-0">' +
                            '<div class="transaction-section h-100">' + rec[1].email + '</div>' +
                        '</div>' +
                        '<div class="col-md-1 p-0">' +
                            '<div class="transaction-section h-100">' + new Date(rec[1].time).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "numeric",
                                year: "2-digit"}) + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="row transaction-row m-0">' +
                        '<div class="col-md-10 p-0">' +
                            '<div class="transaction-section h-100">' + rec[1].comment + '</div>' +
                        '</div>' +
                        '<div class="col-md-2 p-0">' +
                            '<div class="transaction-section d-flex justify-content-around h-100">' +
                            (rec[1].imageID == null ? "" : '<a class="manage-buttons bi bi-image" href="' + this.getImageURL(rec[1].imageID) + '"></a>') +
                            (rec[1].latitude == null ? "" : '<a class="manage-buttons bi bi-map" href="' + this.getMapsURL(rec[1].latitude, rec[1].longitude) + '"></a>') +
                            '<i class="manage-buttons bi bi-pencil-square" style="color: orange" onclick="UIHandler.EditExpenseUI.expenseID=' + rec[0] + ';UIHandler.switchUI(UIHandler.EditExpenseUI);"></i>' +
                            '<i class="manage-buttons bi bi-trash" style="color: red" onclick="UIHandler.currentUI.deleteModal(' + rec[0] + ')"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
               '</div>';

            this.recordContainer.appendChild(recordRow);
        }
    }

    submitFilterQuery() {
        // escape if input is disabled
        if (!this.enabled) {
            return false;
        }

        // reset filtered data
        LocalDataHandler.filteredData = Object.entries(LocalDataHandler.fullData);

        // filter by query if there's a search query
        if (this.queryField.value !== "") {
            console.log("search");
            LocalDataHandler.filterQuery(this.queryField.value);
        }
        // filter by time if any of the time fields are set
        if (this.minTimeField.value !== "" || this.maxTimeField.value !== "") {
            LocalDataHandler.filterTime(this.minTimeField.value, this.maxTimeField.value);
        }
        // filter by type if the type field isn't default
        if (this.typeField.value !== "Any Type") {
            console.log("type");
            LocalDataHandler.filterType(this.typeField.value);
        }
        // filter by amount if any of the amount fields are set
        if (this.minAmountField.value !== "" || this.maxAmountField.value !== "") {
            LocalDataHandler.filterAmount(this.minAmountField.value, this.maxAmountField.value);
        }
        
        // we always sort
        LocalDataHandler.filterSort(this.sortField.value);
    }

    // display the delete confirmation modal and prime it for deletion
    deleteModal(expenseID) {
        document.getElementById("manageDelete").setAttribute("onclick", "UIHandler.currentUI.deleteExpenseButton(" + expenseID + ");")
        new bootstrap.Modal(document.getElementById("deleteModal")).show();
    }

    // send the delete request
    async deleteExpenseButton(expenseID) {
        UIHandler.currentUI.lockUI();
        await AWSHandler.deleteExpense(expenseID);
        UIHandler.currentUI.unlockUI();
        UIHandler.currentUI.resetUI();
    }

    getMapsURL(latitude, longitude) {
        return "https://www.google.com/maps?q=" + latitude + "," + longitude;
    }

    getImageURL(imageID) {
        return "https://" + bucketName + ".s3." + bucketRegion + ".amazonaws.com/img/" + imageID;
    }
}

UIHandler.NewExpenseUI = new class {
    enabled = false;
    containerNode; // reference to the HTML elements for this screen so it can move in and out of the DOM
    commentField;
    amountField;
    typeField;
    imageField;
    submitButton;

    initializeUI() {
        // initialize all of our html elements
        this.commentField = document.getElementById("newComment");
        this.amountField = document.getElementById("newAmount");
        this.typeField = document.getElementById("newType");
        this.imageField = document.getElementById("newImage");
        this.submitButton = document.getElementById("newSubmit");

        // pop this section out of the DOM and store it
        this.containerNode = document.getElementById("UIContent").removeChild(document.getElementById("newExpense"));
    }

    getContainerNode() {
        return this.containerNode;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (navigator.geolocation) { // trigger geolocation to bring up permission prompt before anything
            navigator.geolocation.getCurrentPosition(()=> {});
        }
        document.getElementById("newExpenseRadio").checked = enabled;
    }

    unlockUI() {
        this.commentField.disabled = false;
        this.amountField.disabled = false;
        this.typeField.disabled = false;
        this.imageField.disabled = false;
        this.submitButton.disabled = false;
    }

    lockUI() {
        this.commentField.disabled = true;
        this.amountField.disabled = true;
        this.typeField.disabled = true;
        this.imageField.disabled = true;
        this.submitButton.disabled = true;
    }

    resetUI() {
        this.commentField.value = "";
        this.amountField.value = "";
        this.typeField.value = "Gas";
        this.imageField.value = "";
    }

    async submitNewExpense() {
        // escape if input is disabled
        if (!this.enabled) {
            return false;
        }

        // these will stay null if geolocation is disallowed
        var lat = null;
        var long = null;
        this.lockUI(); // lock the UI until this operation is done
        if (navigator.geolocation) { // if we have geolocation
            async function getPosition() { // async wrapper for callback-based geolocation
                return new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000});
                });
            }
            try { // try to get our position
                var pos = await getPosition();
                lat = pos.coords.latitude;
                long = pos.coords.longitude;
            }
            catch (err) {
                console.error(err);
            }
        }

        // the key for the new record
        var newKey = Date.now();

        newExpense = { // fill the expense data
            fullName: AWSHandler.loggedInUsername,
            amount: this.amountField.value,
            type: this.typeField.value,
            time: newKey,
            email: AWSHandler.loggedInEmail,
            comment: this.commentField.value,
            latitude: lat,
            longitude: long,
            imageID: this.imageField.value ? newKey.toString() + "." + this.imageField.files[0].name.split('.').pop() : null
        }

        try { // try to upload
            await AWSHandler.uploadNewExpense(newKey.toString(), newExpense, this.imageField.value ? this.imageField.files[0] : null);
            console.log("Submitted expense.");
            this.resetUI(); // if it worked clear the UI and switch to manage expenses
            UIHandler.switchUI(UIHandler.ManageExpensesUI);
        }
        catch (err) {
            console.log(err);
            this.unlockUI(); // it didnt work, dont clear the data and unlock the UI
        }
    }
}

UIHandler.EditExpenseUI = new class {
    enabled = false;
    containerNode; // reference to the HTML elements for this screen so it can move in and out of the DOM
    commentField;
    amountField;
    typeField;
    imageField;
    submitButton;
    expenseID = "";

    initializeUI() {
        // initialize all of our html elements
        this.commentField = document.getElementById("editComment");
        this.amountField = document.getElementById("editAmount");
        this.typeField = document.getElementById("editType");
        this.imageField = document.getElementById("editImage");
        this.submitButton = document.getElementById("editSubmit");

        // pop this section out of the DOM and store it
        this.containerNode = document.getElementById("UIContent").removeChild(document.getElementById("editExpense"));
    }

    getContainerNode() {
        return this.containerNode;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    unlockUI() {
        this.commentField.disabled = false;
        this.amountField.disabled = false;
        this.typeField.disabled = false;
        this.imageField.disabled = false;
        this.submitButton.disabled = false;
    }

    lockUI() {
        this.commentField.disabled = true;
        this.amountField.disabled = true;
        this.typeField.disabled = true;
        this.imageField.disabled = true;
        this.submitButton.disabled = true;
    }

    resetUI() {
        // populate the fields with data from the record we are editing
        this.amountField.value = LocalDataHandler.fullData[this.expenseID].amount;
        this.commentField.value = LocalDataHandler.fullData[this.expenseID].comment;
        this.typeField.value = LocalDataHandler.fullData[this.expenseID].type;

        // if there is an expense image, display a link to it
        if (LocalDataHandler.fullData[this.expenseID].imageID !== null) {
            this.imageField.innerHTML = 'Expense Image: <a href="' + UIHandler.ManageExpensesUI.getImageURL(LocalDataHandler.fullData[this.expenseID].imageID) + '">'
            + LocalDataHandler.fullData[this.expenseID].imageID + '</a>';
        }
        else { // there is no expense image
            this.imageField.innerHTML = "Expense Image: None";
        }
    }

    async submitEditExpense() {
        // escape if input is disabled
        if (!this.enabled) {
            return false;
        }

        this.lockUI(); // lock the UI until the operation is done

        // load the data we are editing
        var editData = LocalDataHandler.fullData[this.expenseID];

        // edit it with the data that has been input
        editData.amount = this.amountField.value;
        editData.comment = this.commentField.value;
        editData.type = this.typeField.value;

        try { // attempt to upload
            await AWSHandler.uploadEditedExpense(this.expenseID, editData);
            console.log("Submitted edited expense");
            this.resetUI(); // upload success, clear this UI and switch to manage expenses
            UIHandler.switchUI(UIHandler.ManageExpensesUI);
        }
        catch (err) {
            console.log(err);
            this.unlockUI(); // didn't succeed, simply unlock the UI
        }
    }
}