package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/go-gl/mathgl/mgl64"

	"rikencau/abart-manager/dockerhandler"
)

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
func getBaseWorkingDir() string {
	const defaultDataWorkingDir = "/datawd"

	baseWorkDir := strings.Trim(os.Getenv("ABART_BASE_WORKDIR"), " ")
	if baseWorkDir != "" {
		if dirExists(baseWorkDir) {
			return baseWorkDir
		} else {
			fmt.Fprintf(os.Stderr, "Invalid specified ABART_BASE_WORKDIR: '%s'\n", baseWorkDir)
			return defaultDataWorkingDir
		}
	} else {
		return defaultDataWorkingDir
	}
}

func getListenedPort() string {
	const defaultListeningPort = "10000"

	listenPort := strings.Trim(os.Getenv("ABART_MGR_LSTN_PORT"), " ")
	if listenPort != "" {
		if _, err := strconv.Atoi(listenPort); err == nil {
			return listenPort
		} else {
			fmt.Fprintf(os.Stderr, "Invalid specified ABART_MGR_LSTN_PORT: '%s'\n", listenPort)
			return defaultListeningPort
		}
	} else {
		return defaultListeningPort
	}
}

func getWorkerNum() int {
	const defaultWorkerNum = 1

	workerNumStr := strings.Trim(os.Getenv("ABART_WORKER_MAXNUM"), " ")
	if workerNumStr != "" {
		if workerNum, err := strconv.Atoi(workerNumStr); err == nil {
			return workerNum
		} else {
			fmt.Fprintf(os.Stderr, "Invalid specified ABART_WORKQUEUE_SIZE: '%d'\n", workerNum)
			return defaultWorkerNum
		}
	} else {
		return defaultWorkerNum
	}
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const okletters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

var letters = []rune(okletters)

func randSeq(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func getSafeFileName(fileName string) string {

	//Beware: Need to keep last 2 extensions (e.g. .nii.gz), since they are used by ANTs to recognise file format

	//lastExt = filepath.Ext(fileName)
	//secondLastExt = filepath.Ext(fileName)
	//sanitize.BaseName(fileName)

	return fileName
}

func fileExists(path string) bool {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return false
	} else {
		return true
	}
}

func dirExists(path string) bool {
	if fileInfo, err := os.Stat(path); !os.IsNotExist(err) && fileInfo.IsDir() {
		return true
	} else {
		return false
	}
}

type TaskParams struct {
	Rotation []float64 `json:"rotation"`
}

func makeTransformMatrix(paramsJson string, matrixFilePath string) bool {
	var p TaskParams
	err := json.Unmarshal([]byte(paramsJson), &p)
	if err != nil {
		fmt.Println("error while retrieving rotation params:", err)
		return false

	} else if len(p.Rotation) != 3 {
		fmt.Println("invalid provided rotation params: %v", p)
		return false

	} else {

		xroll := p.Rotation[0]
		yroll := p.Rotation[1]
		zroll := p.Rotation[2]
		if xroll == 0 && yroll == 0 && zroll == 0 {
			fmt.Println("Null transform - skipping pre-transform matrix:")
			return false
		}

		//get the transformation matrix
		rotated := mgl64.Ident3().Mul3(mgl64.Rotate3DX(xroll)).Mul3(mgl64.Rotate3DY(yroll)).Mul3(mgl64.Rotate3DZ(zroll))

		//fmt.Printf("%+v", rotated)
		var sb strings.Builder
		sb.WriteString("Transform: AffineTransform_double_3_3\n")
		sb.WriteString("Parameters:")
		for r := 0; r < 3; r++ {
			for c := 0; c < 3; c++ {
				fmt.Fprintf(&sb, " %f", rotated.At(r, c))
			}
			sb.WriteString(" ")
		}
		//translation (?)
		sb.WriteString(" 0 0 0\n")
		//origin
		sb.WriteString("FixedParameters: 0 0 0\n")

		err := os.WriteFile(matrixFilePath, []byte(sb.String()), 0644)

		if err != nil {
			//could not create file
			fmt.Println("error while create pre-transform matrix:", err)
			return false
		}

		return true
	}
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

func getTaskDir(taskId string) string {
	return path.Join(getBaseWorkingDir(), taskId)
}

func getTaskExistingTaskDir(taskId string) string {
	taskFullDir := getTaskDir(taskId)
	if dirExists(taskFullDir) {
		return taskFullDir
	} else {
		return ""
	}
}

func getTaskExistingStatus(taskFullDir string, defaultStatus string) string {
	statusPath := path.Join(taskFullDir, "STATUS")
	if fileExists(statusPath) {
		//if the file exists, at least the task was created
		f, err := os.Open(statusPath)
		if err != nil {
			//could not read the file for some reason, can not say more than task was created...
			return "created"
		}
		defer f.Close()

		scanner := bufio.NewScanner(f)
		if scanner.Scan() {
			//actual status indicated on first line
			return scanner.Text()
		} else {
			//could not read the file for some reason, can not say more than task was created...
			return "created"
		}
	} else {
		return defaultStatus
	}
}

type TaskConfig struct {
	MovingImage  string `json:"moving_image"`
	PreTransform string `json:"pre_transform"`
}

type TaskId string

type Task struct {
	id          TaskId
	workdir     string
	status      string
	lastMessage string
	inputFile   string
	params      string
	config      TaskConfig
}

func NewTask() Task {
	taskId := TaskId(randSeq(12))

	//create a new directory for the task
	taskFullDir := getTaskDir(string(taskId))
	err := os.Mkdir(taskFullDir, 0755)
	if err != nil {
		fmt.Println(err)
	}

	return Task{
		id:      taskId,
		workdir: taskFullDir,
		status:  "created",
	}
}

func TaskFromID(taskId string) Task {
	taskFullDir := getTaskExistingTaskDir(taskId)
	var status string
	if taskFullDir == "" {
		status = "unknown"
	} else {
		status = getTaskExistingStatus(taskFullDir, "created")
	}
	return Task{
		id:      TaskId(taskId),
		workdir: taskFullDir,
		status:  status,
	}
}

func (t *Task) getWorkerContainerName() string {
	return "worker_" + string(t.id)
}

func (t *Task) prepare() {

	jsonData, err := json.Marshal(t.config)
	if err != nil {
		t.status = "failed"
		t.lastMessage = "Error generating config file"
		fmt.Println(t.lastMessage)
		fmt.Println(err)
		return
	}

	err = ioutil.WriteFile(path.Join(t.workdir, "config.json"), jsonData, 0644)
	if err != nil {
		t.status = "failed"
		t.lastMessage = "Error writing config file"
		fmt.Println(t.lastMessage)
		fmt.Println(err)
		return
	}
	t.status = "prepared"
}

func (t *Task) run() {
	dockerhandler.RunContainer(
		os.Getenv("ABART_WORKER_IMAGE"),
		os.Getenv("ABART_WORK_VOL"),
		os.Getenv("ABART_PRIVATE_NET"),
		getBaseWorkingDir(),
		t.workdir,
		t.getWorkerContainerName(),
		func() { t.status = "running" },
	)
	t.status = "finished"
}

func (t *Task) stop() {
	t.status = "stopping"
	dockerhandler.StopNRemoveContainer(
		t.getWorkerContainerName(),
	)
	t.status = "canceled"
}

func (t *Task) getLogsReader() io.ReadCloser {
	return dockerhandler.FollowContainerLogs(
		t.getWorkerContainerName(),
	)
}

//. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
/* implements a task queue to limit number of concurrently processed tasks,
while allowing unlimited task submission
*/
type TaskHandler struct {
	//channel used as task queue
	c chan TaskId
	//map containing definition of tasks to run
	m map[TaskId]*Task
}

//endlessly wait for a new task enqueued in the channel, and process it
func (th *TaskHandler) consumeQueue() {
	for {
		//dequeue a new task to process
		taskId := <-th.c

		//retrieve actual task (unless it has already been canceled)
		t, ok := th.m[taskId]
		if ok {
			//process the task in current routine
			t.run()
			//remove task definition
			delete(th.m, t.id)
		}

	}
}

func (th *TaskHandler) StartTask(t Task) {
	t.prepare()
	if t.status == "prepared" {
		//store task definition
		th.m[t.id] = &t
	}
	//process in a go routine since enqueuing might be blocking
	go func() {
		//enqueue the task for processing
		th.c <- t.id
	}()
}

func initTaskHandler() TaskHandler {

	//retrieve max number of task executed at same time
	workerNum := getWorkerNum()

	th := TaskHandler{
		//task queue must be at least the size of max worker number
		make(chan TaskId, workerNum),
		make(map[TaskId]*Task),
	}

	//create enough executor go routines to be able to conccurently process as much tasks as specified
	for i := 0; i < workerNum; i++ {
		go th.consumeQueue()
	}

	return th
}

func (th *TaskHandler) CancelTask(taskId TaskId) {

	//retrieve actual t (won't find any if it has already been canceled)
	t, ok := th.m[taskId]
	if ok {

		t.stop()

		delete(th.m, t.id)
	}

}

func (th *TaskHandler) followTaskLogs(taskId TaskId) io.ReadCloser {

	//retrieve actual t (unless it has already been canceled)
	t, ok := th.m[taskId]

	if ok && t.status == "running" {
		return t.getLogsReader()
	} else {
		return nil
	}

}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

type TaskAPI interface {
	getApiVersion(w http.ResponseWriter, r *http.Request)
	createTask(w http.ResponseWriter, r *http.Request)
	cancelTask(w http.ResponseWriter, r *http.Request)
	getTaskStatus(w http.ResponseWriter, r *http.Request)
	followTaskLog(w http.ResponseWriter, r *http.Request)
}

type TaskApiImpl struct {
	th TaskHandler
}

func (api *TaskApiImpl) getApiVersion(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Endpoint Hit: version")
	fmt.Fprintf(w, "ABART_Service: v0.1\n")
}

//Create a task for the uploaded file and parameters, and start registration process
func (api *TaskApiImpl) createTask(w http.ResponseWriter, r *http.Request) {
	fmt.Println("🟢🟢🟢🟢🟢 Endpoint Hit: Create Task/File Upload ")

	task := NewTask()
	fmt.Println("\tTaskID: " + task.id)

	// Parse the multipart form, (10 MB max in memory at a time)
	r.ParseMultipartForm(10 << 20)

	// FormFile returns the first file for the given key `inputDataFile`
	// it also returns the FileHeader so we can get the Filename,
	// the Header and the size of the file
	file, handler, err := r.FormFile("inputDataFile")
	if err != nil {
		fmt.Println("Error Retrieving the File")
		fmt.Println(err)
		return
	}
	defer file.Close()
	fmt.Printf("Uploaded File: %+v\n", handler.Filename)
	fmt.Printf("File Size: %+v\n", handler.Size)
	fmt.Printf("MIME Header: %+v\n", handler.Header)

	//provided file name might be unsafe
	safeFileName := getSafeFileName(handler.Filename)
	//save received file under the task directory
	fullFilePath := path.Join(task.workdir, safeFileName)
	tempFile, err := os.Create(fullFilePath)

	defer tempFile.Close()

	// read all of the contents of our uploaded file into a byte array
	fileBytes, err := ioutil.ReadAll(file)
	if err != nil {
		fmt.Println(err)
	}
	// write this byte array to file
	tempFile.Write(fileBytes)
	task.inputFile = fullFilePath
	task.config.MovingImage = fullFilePath

	//retreive task parameters sent along with the file
	paramsJson := r.PostFormValue("params")
	if paramsJson == "" {
		fmt.Println("Error Retrieving parameters")
		fmt.Println(err)
		return
	}

	fmt.Printf("Parameters : %+v\n", paramsJson)
	task.params = paramsJson
	matrixFileName := "initialTransform.tfm"
	if makeTransformMatrix(paramsJson, path.Join(task.workdir, matrixFileName)) {
		task.config.PreTransform = matrixFileName
	}

	//rest of the process can be defered after the response is sent
	api.th.StartTask(task)

	//return task ID in Location header
	w.Header().Set("Location", path.Join(r.RequestURI, string(task.id)))
	w.WriteHeader(http.StatusCreated)

	//extra message that may be displayed to user
	fmt.Fprintf(w, "{\"taskId\": \"%s\", \"message\":\"%s\"}", task.id, "Successfully submitted task!")
}

func (api *TaskApiImpl) cancelTask(w http.ResponseWriter, r *http.Request) {
	fmt.Println("🔴🔴🔴🔴🔴 Endpoint Hit: cancel")

	vars := mux.Vars(r)
	taskId := vars["taskId"]
	task := TaskFromID(taskId)

	if task.status == "unknown" {
		w.WriteHeader(http.StatusNotFound)
	} else {
		//cancel task
		api.th.CancelTask(task.id)
		fmt.Fprintf(w, "{\"taskId\": \"%s\", \"status\":\"%s\"}", taskId, "canceling")
	}
}

func (api *TaskApiImpl) getTaskStatus(w http.ResponseWriter, r *http.Request) {
	fmt.Println("🔵🔵🔵🔵🔵 Endpoint Hit: status")

	vars := mux.Vars(r)
	taskId := vars["taskId"]
	task := TaskFromID(taskId)

	if task.status == "unknown" {
		w.WriteHeader(http.StatusNotFound)
	} else {
		fmt.Fprintf(w, "{\"taskId\": \"%s\", \"status\":\"%s\"}", taskId, task.status)
	}
}

func (api *TaskApiImpl) downloadResult(w http.ResponseWriter, r *http.Request, Filename string) {

	fmt.Println("🟡🟡🟡🟡🟡 Endpoint Hit: download")
	vars := mux.Vars(r)
	taskId := vars["taskId"]

	task := TaskFromID(taskId)
	if task.status == "unknown" {
		w.WriteHeader(http.StatusNotFound)
	} else {

		Openfile, err := os.Open(path.Join(task.workdir, Filename))
		//Close after function return
		defer Openfile.Close()

		if err != nil {
			http.Error(w, "File not found.", 404) //return 404 if file is not found
			return
		}

		tempBuffer := make([]byte, 512)                       //Create a byte array to read the file later
		Openfile.Read(tempBuffer)                             //Read the file into  byte
		FileContentType := http.DetectContentType(tempBuffer) //Get file header

		FileStat, _ := Openfile.Stat()                     //Get info from file
		FileSize := strconv.FormatInt(FileStat.Size(), 10) //Get file size as a string

		//set the headers
		w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
		w.Header().Set("Content-Disposition", "attachment; filename="+path.Base(Filename))
		w.Header().Set("Content-Type", FileContentType)
		w.Header().Set("Content-Length", FileSize)

		Openfile.Seek(0, 0)  //reset the offset back to 0 since 1 buffer length bytes have been read from the file already
		io.Copy(w, Openfile) //'Copy' the file to the client
	}
}

func (api *TaskApiImpl) downloadResultsZip(w http.ResponseWriter, r *http.Request) {
	api.downloadResult(w, r, "abartResults.zip")
}

func (api *TaskApiImpl) downloadResultsRegistered(w http.ResponseWriter, r *http.Request) {
	api.downloadResult(w, r, "results/registered/UserToAtlas_Warped.nii.gz")
}

func (api *TaskApiImpl) downloadResultsColorLUT(w http.ResponseWriter, r *http.Request) {
	api.downloadResult(w, r, "results/atlas/sp2_label_512_3dslicer_v1.0.0.ctbl")
}

func (api *TaskApiImpl) downloadResultsLabels(w http.ResponseWriter, r *http.Request) {
	api.downloadResult(w, r, "results/labels/AtlasToUser_labels.nii.gz")
}

func (api *TaskApiImpl) followTaskLogs(w http.ResponseWriter, r *http.Request) {

	sendMessage := func(conn *websocket.Conn, message string) {
		w, err := conn.NextWriter(websocket.TextMessage)
		defer w.Close()

		if err != nil {
			fmt.Println("\n🔺🔻Could not get NextWriter : ", err)
		} else {
			io.Copy(w, strings.NewReader(message))
		}
	}

	fmt.Println("🟣🟣🟣🟣🟣 Endpoint Hit: logs")

	vars := mux.Vars(r)
	taskId := vars["taskId"]

	task := TaskFromID(taskId)
	if task.status == "unknown" {
		w.WriteHeader(http.StatusNotFound)
	} else {

		//get actual task
		t, ok := api.th.m[task.id]
		if ok {

			var upgrader = websocket.Upgrader{
				ReadBufferSize:  1024,
				WriteBufferSize: 1024,
				CheckOrigin: func(r *http.Request) bool {
					origin := r.Header.Get("Origin")
					//origin when debugging or when running in Desktop mode
					return origin == "http://localhost:9000" ||
						origin == "http://localhost:9090"
				},
			}

			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				fmt.Println("\n🔺🔻Error during upgrade:", err)
				return
			}
			fmt.Println("🟪🟪🟪 Upgraded to Websockets 🟪🟪🟪")
			defer conn.Close()

			//FIXME if task no yet executed, wait for it to be instead of returning immediately with an empty response
			var rc io.ReadCloser
			if t.status == "finished" {
				sendMessage(conn, "Task already finished\n")
			} else if t.status == "prepared" {
				sendMessage(conn, "Task not yet started...\n")
				//wait until task change status (either becomes running or canceled)
				for t.status == "prepared" {
					sendMessage(conn, "warming-up...\n")
					time.Sleep(2 * time.Second)
				}
				sendMessage(conn, "Task is now "+t.status+"\n")
			}

			if t.status == "running" {
				rc = api.th.followTaskLogs(t.id)
			}

			if rc != nil {

				defer rc.Close()

				//transfer up to 1024 bytes at a time through the websocket
				buf := make([]byte, 1024)
				moreToCome := true

				for moreToCome {
					var written int

					//TODO stop on client request

					//get websocket NextWriter for next message
					w, err := conn.NextWriter(websocket.TextMessage)
					if err != nil {
						fmt.Println("\n🔺🔻Could not get NextWriter : ", err)
						break
					}

					//read another chunk
					nr, er := rc.Read(buf)
					if nr > 0 {
						//write what was read
						nw, ew := w.Write(buf[0:nr])
						if nw < 0 || nr < nw {
							nw = 0
							if ew == nil {
								fmt.Println("\n🔺🔻Could not write to websocket : ", err)
							}
						}
						written = nw
						if ew != nil {
							err = ew
							break
						}
						if nr != nw {
							fmt.Println("\n🔺🔻Could not write all to websocket : ", err)
							break
						}
					} else {
						//nothing was read...
						written = 0
					}
					if er != nil {
						if er != io.EOF {
							fmt.Println("\n🔺🔻Could not read logs : ", err)
							err = er
						}
					}
					//

					if err != nil {
						fmt.Println("end of streams : ", taskId)
						moreToCome = false
					} else {
						//stop sending when there's no more to read
						moreToCome = written > 0
					}

					//close write to send message through websocket
					if err := w.Close(); err != nil {
						fmt.Println("\n🔺🔻Could not close Writer : ", err)
						break
					}
				}

				//gracefully close the socket
				conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			}

		}
	}

}

//. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
func handleRequests() {

	fmt.Printf("ABART_WORK_VOL: '%s'\n", os.Getenv("ABART_WORK_VOL"))
	fmt.Printf("ABART_WORKER_IMAGE: '%s'\n", os.Getenv("ABART_WORKER_IMAGE"))
	fmt.Printf("ABART_PRIVATE_NET: '%s'\n", os.Getenv("ABART_PRIVATE_NET"))
	fmt.Printf("ABART_WORKER_MAXNUM: '%s'\n", os.Getenv("ABART_WORKER_MAXNUM"))

	fmt.Printf("---\n")

	//new API handler
	api := TaskApiImpl{
		th: initTaskHandler(),
	}

	corsHnd := handlers.CORS(
		handlers.AllowedHeaders([]string{"content-type"}),

		//allowing Credentials (Cookies) to go through
		handlers.AllowCredentials(),

		//all methods
		handlers.AllowedMethods([]string{
			http.MethodHead,
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
		}),

		//during debug, direct access of the API
		handlers.AllowedOrigins([]string{"http://localhost:9000", "http://localhost:9090"}),

		//browser may cache the Options reponse for up to 1 hour (expressed in seconds)
		handlers.MaxAge(3600),
	)

	// creates a new instance of a mux router
	apiRouter := mux.NewRouter().PathPrefix("/api").Subrouter()

	//
	apiRouter.HandleFunc("/version", api.getApiVersion).Methods(http.MethodGet, http.MethodOptions)

	apiRouter.HandleFunc("/tasks", api.createTask).Methods("POST", http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/cancel", api.cancelTask).Methods("PUT", http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/logs", api.followTaskLogs).Methods(http.MethodGet, http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/status", api.getTaskStatus).Methods(http.MethodGet, http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/results/registered", api.downloadResultsRegistered).Methods(http.MethodGet, http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/results/colorlut", api.downloadResultsColorLUT).Methods(http.MethodGet, http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/results/labels", api.downloadResultsLabels).Methods(http.MethodGet, http.MethodOptions)
	apiRouter.HandleFunc("/tasks/{taskId}/results/all", api.downloadResultsZip).Methods(http.MethodGet, http.MethodOptions)

	apiRouter.Use(corsHnd)

	log.Fatal(http.ListenAndServe(":"+getListenedPort(), corsHnd(apiRouter)))
}

func main() {
	rand.Seed(time.Now().UnixNano())

	fmt.Printf("WORK_DIR: '%s'\n", getBaseWorkingDir())
	fmt.Printf("LISTEN_PORT: '%s'\n", getListenedPort())

	handleRequests()
}
