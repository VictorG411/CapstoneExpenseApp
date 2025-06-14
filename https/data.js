AWSHandler = new class {
    loggedInUsername; // full name of logged in user
    loggedInEmail; // email of logged in user
    AWS; // our AWS.S3 object
    uploading = false; // if we are currently uploading
    dataToUpload; // data which will be uploaded
    imageToUpload; // image which will be uploaded

    initialize() {
        // get the auth tokens passed via URL from amazon
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const fragment = window.location.hash;
        const params = new URLSearchParams(fragment.substring(1)); // Remove the # before parsing
        const idToken = params.get('id_token');
        const accessToken = params.get('access_token');

        // create new credentials object
        var creds = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: identityPoolId,
            Logins: {
                [idProvider]: idToken
            }
        })

        // update config with new credentials
        AWS.config.update({
            region: bucketRegion,
            credentials: creds,
        });

        // use the token to get credentials from amazon
        AWS.config.credentials.get();

        // create a cognito identity provider to get our full name and email
        const Cognito = new AWS.CognitoIdentityServiceProvider();

        // get user information, also check to see if we are logged in
        Cognito.getUser({ AccessToken: accessToken }, (err, data) => {
            if (err) { // couldnt log in
                window.location.replace(cognitoLoginURL); // redirect to login
                console.error("Error retrieving user info:", err);
            } else { // we got the user data, save it
                console.log("Retrieved user data.");
                AWSHandler.loggedInUsername = data.UserAttributes[2]
                for (var ii = 0; ii < data.UserAttributes.length; ii++) {
                    if (data.UserAttributes[ii].Name == "name") {
                        AWSHandler.loggedInUsername = data.UserAttributes[ii].Value;
                    }
                    else if (data.UserAttributes[ii].Name == "email") {
                        AWSHandler.loggedInEmail = data.UserAttributes[ii].Value;
                    }
                }
                // draw the username we fetched
                UIHandler.drawUsername();
            }
        });

        // configure our S3 bucket
        this.AWS = new AWS.S3({
            apiVersion: "2006-03-01",
            params: { Bucket: bucketName },
        });
    }

    async uploadNewExpense(newKey, newData, newImage) {
        if (this.uploading) { // dont start a new upload if we're already uploading
            console.error("Expense already uploading!");
            return false;
        }

        try { // try to update latest expense data to merge with our new expense
            this.dataToUpload = await this.getExpenseData();
        } catch (err) {// couldnt do it, just return false
            console.error("Error loading data:", err);
            return false;
        }

        // add the new data to the latest expense data we just got
        this.dataToUpload[newKey] = newData;
        //console.log(this.dataToUpload);

        // if we failed to upload the updated expense data return false
        if(!await this.putExpenseData()) {
            return false;
        }

        if(newImage !== null) { // only attempt to upload an image if it was sent
            this.imageToUpload = newImage;
            if (!await this.putExpenseImage(newData.imageID)) { // if we failed to upload image return false
                console.error("Failed to upload image!");
                return false;
            }
        }
        return true;
    }

    async uploadEditedExpense(expenseID, editData) {
        if (this.uploading) { // dont start a new upload if we're already uploading
            console.error("Expense already uploading!");
            return false;
        }

        try { // try to get latest expense data to merge
            this.dataToUpload = await this.getExpenseData();
        } catch (err) { // couldnt get it, abort
            console.error("Error loading data:", err);
            return false;
        }

        // merge our edited data with latest data
        this.dataToUpload[expenseID] = editData;
        //console.log(this.dataToUpload);

        if (!await this.putExpenseData()) { // if we failed to upload return false
            return false;
        }

        return true;
    }

    async deleteExpense(expenseID) {
        if (this.uploading) { // dont start deleting if we're uploading
            console.error("Expense already uploading!");
            return false;
        }

        try { // try to get latest expense data to modify
            this.dataToUpload = await this.getExpenseData();
        } catch (err) { // couldnt get latest data, abort
            console.error("Error loading data:", err);
            return false;
        }

        // assign the image key if it exists so we can delete that too
        var imageKey = this.dataToUpload[expenseID].imageID ? "img/" + this.dataToUpload[expenseID].imageID : null;

        try { // try to remove the ID we were passed
            delete this.dataToUpload[expenseID];
            console.log("Deleted data.");
        }
        catch(err) { // couldnt do it, put it in the console but don't stop going
            console.log("Could not delete data. Was it already deleted?" + err);
        }

        // if there was an image key
        if (imageKey) {
            try { // try to delete the image with the key
                await AWSHandler.AWS.deleteObject({
                    Key: imageKey,
                    Bucket: bucketName
                }).promise();
                console.log("Deleted image.");
            }
            catch (err) { // couldnt delete the image, display the error and keep going
                console.log("Could not delete image: " + err);
            }
        }

        // upload the altered expense data
        var uploaded = await this.putExpenseData();

        return uploaded;
    }

    async putExpenseImage(imageID) {
        if (!this.imageToUpload) { // dont try to upload an image if there is none to upload
            return false;
        }

        //console.log(imageID);
        var imageUpload = new AWS.S3.ManagedUpload({ // create a new upload configuration
            params: {
                Key: "img/" + imageID,
                Bucket: bucketName,
                Body: this.imageToUpload,
                ContentType: "image/" + imageID.split('.').pop().toLowerCase(), // get the file type for the MIME type
            },
        });

        try { // try to upload
            await imageUpload.promise(); // Wait for the upload to finish
            console.log("Uploaded expense image.");
            return true; // Upload succeeded
        } catch (err) {
            console.error("Could not upload expense image: ", err.message);
            return false; // Upload failed
        }
    }

    async putExpenseData() {
        if (!this.dataToUpload) {
            return false; // No data to upload, so return false immediately.
        }

        // create a JSON file out of the data to upload
        const file = new File([JSON.stringify(this.dataToUpload)], "Expenses.json", { type: "application/json" });

        // create our upload object
        const upload = new AWS.S3.ManagedUpload({
            params: {
                Key: "Expenses.json",
                Bucket: bucketName,
                Body: file,
                CacheControl: 'no-cache', // disable caching
            },
        });

        try {
            await upload.promise(); // Wait for the upload to finish
            console.log("Uploaded expense data.");
            return true; // Upload succeeded
        } catch (err) {
            console.error("Could not upload expense data: ", err.message);
            return false; // Upload failed
        }
    }

    getExpenseData() { // get latest expense data
        return new Promise((resolve, reject) => {
            this.AWS.getObject({ Key: "Expenses.json" }, (err, data) => {
                if (err) {
                    console.error(err, err.stack);
                    return reject(err);
                }

                try { // try and parse the JSON data into an object
                    const json = JSON.parse(data.Body.toString('utf-8'));
                    resolve(json);
                } catch (parseErr) {
                    reject(parseErr);
                }
            });
        });
    }
}

LocalDataHandler = new class {
    fullData; // the full expense data retrieved from S3
    filteredData; // the filtered expense data

    async loadData() { // load the data from S3 and prime filteredData
        try {
            this.fullData = await AWSHandler.getExpenseData();
            this.filteredData = Object.entries(this.fullData);
        } catch (err) {
            console.error("Error loading data:", err);
        }
    }

    // filter by a time range
    filterTime(minTime, maxTime) {
        if (minTime !== "") { // if there's a minimum time constraint
            var minStamp = Date.parse(minTime);
            console.log("minTime: " + minStamp);
            for (var ii = 0; ii < this.filteredData.length; ii++) {
                if (this.filteredData[ii][1].time < minStamp) {
                    this.filteredData.splice(ii, 1);
                    ii--;
                }
            }
        }
        if (maxTime !== "") { // if there's a maximum time constraint
            var maxStamp = Date.parse(maxTime);
            console.log("maxTime: " + maxStamp);
            for (var ii = 0; ii < this.filteredData.length; ii++) {
                if (this.filteredData[ii][1].time > maxStamp) {
                    this.filteredData.splice(ii, 1);
                    ii--;
                }
            }
        }
    }

    // filter by an expense type
    filterType(type) {
        for (var ii = 0; ii < this.filteredData.length; ii++) {
            if (this.filteredData[ii][1].type !== type) {
                this.filteredData.splice(ii, 1);
                ii--;
            }
        }
    }

    // filter by a currency range
    filterAmount(minAmount, maxAmount) {
        if (minAmount !== "") { // if there's a minimum amount constraint
            var minFloat = Number.parseFloat(minAmount);
            console.log("minFloat: " + minFloat);
            for (var ii = 0; ii < this.filteredData.length; ii++) {
                if (this.filteredData[ii][1].amount < minFloat) {
                    this.filteredData.splice(ii, 1);
                    ii--;
                }
            }
        }
        if (maxAmount !== "") { // if there's a maximum amount constraint
            var maxFloat = Number.parseFloat(maxAmount);
            console.log("maxFloat: " + maxFloat);
            for (var ii = 0; ii < this.filteredData.length; ii++) {
                if (this.filteredData[ii][1].amount > maxFloat) {
                    this.filteredData.splice(ii, 1);
                    ii--;
                }
            }
        }
    }

    // filter by a search query
    filterQuery(query) {
        for (var ii = 0; ii < this.filteredData.length; ii++) {
            if (!(this.filteredData[ii][1].fullName.includes(query) ||
                this.filteredData[ii][1].email.includes(query) ||
                this.filteredData[ii][1].comment.includes(query))) {
                this.filteredData.splice(ii, 1);
                ii--;
            }
        }
    }

    // sort the filtered data
    filterSort(sortType) {
        // invert the sorting direction if we're ascending
        var directionMult = (sortType.includes("Ascending") ? 1 : -1);

        if (sortType.includes("Time")) { // if we're sorting by time
            this.filteredData.sort((a, b) => {
                if (a[1].time === b[1].time) {
                    return 0;
                }
                return (Number.parseInt(a[1].time) > Number.parseInt(b[1].time) ? 1 : -1) * directionMult;
            })
        }
        else { // we're sorting by amount
            this.filteredData.sort((a, b) => {
                if (a[1].amount === b[1].amount) {
                    return 0;
                }
                return (Number.parseFloat(a[1].amount) > Number.parseFloat(b[1].amount) ? 1 : -1) * directionMult;
            })
        }
    }

    // exports a full csv of all data displayed without altering any of it
    exportFullCSV() {
        // create the headings
        var csvString = "ID,FullName,Amount,Type,Time,Email,Comment,Latitude,Longitude,ImageID\n";
        for (var ii = 0; ii < this.filteredData.length; ii++) { // loop through all currently displayed data
            csvString +=
                this.filteredData[ii][0] + "," + // ID
                this.filteredData[ii][1].fullName + "," +
                this.filteredData[ii][1].amount + "," +
                this.filteredData[ii][1].type + "," +
                this.filteredData[ii][1].time + "," +
                this.filteredData[ii][1].email + "," +
                this.filteredData[ii][1].comment + "," +
                this.filteredData[ii][1].latitude + "," +
                this.filteredData[ii][1].longitude + "," +
                this.filteredData[ii][1].imageID + "\n";
        }

        // create a csv file from the string
        const file = new File([csvString], "FullExpenseExport.csv", {type: "text/csv" })

        // download the file
        const link = document.createElement('a')
        const url = URL.createObjectURL(file)

        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    }

    // exports a csv of displayed data, formatting necessary data to conform to the three column csv format
    exportThreeColumnCSV() {
        // create the headings
        var csvString = "Date,Description,Amount\n";
        for (var ii = 0; ii < this.filteredData.length; ii++) { // loop through all currently displayed data
            csvString +=
                new Date(this.filteredData[ii][1].time).toLocaleDateString("en-US", { // convert the date to MM/DD/YY
                    day: "numeric",
                    month: "numeric",
                }) + "," +
                this.filteredData[ii][1].type + // create a description column from type and comment
                (this.filteredData[ii][1].comment !== "" ? ": " + this.filteredData[ii][1].comment : "") + "," +
                "-" + this.filteredData[ii][1].amount + "\n"; // add a negative sign to amount to indicate debit
        }

        // create a csv file from the string
        const file = new File([csvString], "ThreeColumnExpenseExport.csv", { type: "text/csv" })

        // download the file
        const link = document.createElement('a')
        const url = URL.createObjectURL(file)

        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    }
}

