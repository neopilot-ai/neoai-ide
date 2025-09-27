package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/storage/memory"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

// GitService represents the Git service
type GitService struct {
	workspaceDir string
}

// Repository represents a Git repository
type Repository struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	URL         string    `json:"url"`
	Branch      string    `json:"branch"`
	LastCommit  *Commit   `json:"lastCommit"`
	Status      *Status   `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Commit represents a Git commit
type Commit struct {
	Hash      string    `json:"hash"`
	Message   string    `json:"message"`
	Author    Author    `json:"author"`
	Date      time.Time `json:"date"`
	Files     []string  `json:"files"`
}

// Author represents a commit author
type Author struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Status represents repository status
type Status struct {
	Clean        bool     `json:"clean"`
	StagedFiles  []string `json:"stagedFiles"`
	ModifiedFiles []string `json:"modifiedFiles"`
	UntrackedFiles []string `json:"untrackedFiles"`
	Ahead        int      `json:"ahead"`
	Behind       int      `json:"behind"`
}

// Branch represents a Git branch
type Branch struct {
	Name      string  `json:"name"`
	IsActive  bool    `json:"isActive"`
	LastCommit *Commit `json:"lastCommit"`
	Ahead     int     `json:"ahead"`
	Behind    int     `json:"behind"`
}

// CloneRequest represents a repository clone request
type CloneRequest struct {
	URL       string `json:"url"`
	ProjectID string `json:"projectId"`
	Branch    string `json:"branch,omitempty"`
}

// CommitRequest represents a commit request
type CommitRequest struct {
	Message string   `json:"message"`
	Files   []string `json:"files,omitempty"`
	Author  Author   `json:"author"`
}

// PushRequest represents a push request
type PushRequest struct {
	Remote string `json:"remote,omitempty"`
	Branch string `json:"branch,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// NewGitService creates a new Git service instance
func NewGitService(workspaceDir string) *GitService {
	return &GitService{
		workspaceDir: workspaceDir,
	}
}

// getProjectPath returns the file system path for a project
func (gs *GitService) getProjectPath(projectID string) string {
	return filepath.Join(gs.workspaceDir, projectID)
}

// openRepository opens a Git repository
func (gs *GitService) openRepository(projectID string) (*git.Repository, error) {
	projectPath := gs.getProjectPath(projectID)
	return git.PlainOpen(projectPath)
}

// Health check endpoint
func (gs *GitService) healthHandler(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "healthy",
		"service":   "git-service",
		"version":   "1.0.0",
		"timestamp": time.Now().UTC(),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Clone repository endpoint
func (gs *GitService) cloneHandler(w http.ResponseWriter, r *http.Request) {
	var req CloneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		gs.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.URL == "" || req.ProjectID == "" {
		gs.sendError(w, "URL and projectId are required", http.StatusBadRequest)
		return
	}

	projectPath := gs.getProjectPath(req.ProjectID)
	
	// Ensure directory exists
	if err := os.MkdirAll(projectPath, 0755); err != nil {
		gs.sendError(w, "Failed to create project directory", http.StatusInternalServerError)
		return
	}

	// Clone options
	cloneOptions := &git.CloneOptions{
		URL:      req.URL,
		Progress: os.Stdout,
	}

	if req.Branch != "" {
		cloneOptions.ReferenceName = plumbing.ReferenceName("refs/heads/" + req.Branch)
		cloneOptions.SingleBranch = true
	}

	// Clone repository
	repo, err := git.PlainClone(projectPath, false, cloneOptions)
	if err != nil {
		gs.sendError(w, fmt.Sprintf("Failed to clone repository: %v", err), http.StatusInternalServerError)
		return
	}

	// Get repository info
	repoInfo, err := gs.getRepositoryInfo(repo, req.ProjectID)
	if err != nil {
		gs.sendError(w, "Failed to get repository info", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "Repository cloned successfully",
		"repository": repoInfo,
	})
}

// Get repository status endpoint
func (gs *GitService) statusHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	status, err := gs.getRepositoryStatus(repo)
	if err != nil {
		gs.sendError(w, "Failed to get repository status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": status,
	})
}

// Get repository info endpoint
func (gs *GitService) infoHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	repoInfo, err := gs.getRepositoryInfo(repo, projectID)
	if err != nil {
		gs.sendError(w, "Failed to get repository info", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"repository": repoInfo,
	})
}

// Commit changes endpoint
func (gs *GitService) commitHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	var req CommitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		gs.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		gs.sendError(w, "Commit message is required", http.StatusBadRequest)
		return
	}

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	worktree, err := repo.Worktree()
	if err != nil {
		gs.sendError(w, "Failed to get worktree", http.StatusInternalServerError)
		return
	}

	// Stage files
	if len(req.Files) > 0 {
		for _, file := range req.Files {
			_, err := worktree.Add(file)
			if err != nil {
				gs.sendError(w, fmt.Sprintf("Failed to stage file %s: %v", file, err), http.StatusInternalServerError)
				return
			}
		}
	} else {
		// Stage all changes
		_, err := worktree.Add(".")
		if err != nil {
			gs.sendError(w, "Failed to stage changes", http.StatusInternalServerError)
			return
		}
	}

	// Create commit
	commit, err := worktree.Commit(req.Message, &git.CommitOptions{
		Author: &object.Signature{
			Name:  req.Author.Name,
			Email: req.Author.Email,
			When:  time.Now(),
		},
	})
	if err != nil {
		gs.sendError(w, "Failed to create commit", http.StatusInternalServerError)
		return
	}

	// Get commit object
	commitObj, err := repo.CommitObject(commit)
	if err != nil {
		gs.sendError(w, "Failed to get commit object", http.StatusInternalServerError)
		return
	}

	commitInfo := &Commit{
		Hash:    commit.String(),
		Message: commitObj.Message,
		Author: Author{
			Name:  commitObj.Author.Name,
			Email: commitObj.Author.Email,
		},
		Date: commitObj.Author.When,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Changes committed successfully",
		"commit":  commitInfo,
	})
}

// Push changes endpoint
func (gs *GitService) pushHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	var req PushRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		gs.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	// Push options
	pushOptions := &git.PushOptions{
		RemoteName: "origin",
		Progress:   os.Stdout,
	}

	if req.Remote != "" {
		pushOptions.RemoteName = req.Remote
	}

	// Push to remote
	err = repo.Push(pushOptions)
	if err != nil {
		gs.sendError(w, fmt.Sprintf("Failed to push: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Changes pushed successfully",
	})
}

// Get branches endpoint
func (gs *GitService) branchesHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	branches, err := gs.getBranches(repo)
	if err != nil {
		gs.sendError(w, "Failed to get branches", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"branches": branches,
	})
}

// Create branch endpoint
func (gs *GitService) createBranchHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	var req struct {
		Name string `json:"name"`
		From string `json:"from,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		gs.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		gs.sendError(w, "Branch name is required", http.StatusBadRequest)
		return
	}

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	worktree, err := repo.Worktree()
	if err != nil {
		gs.sendError(w, "Failed to get worktree", http.StatusInternalServerError)
		return
	}

	// Create branch options
	branchOptions := &git.CheckoutOptions{
		Branch: plumbing.ReferenceName("refs/heads/" + req.Name),
		Create: true,
	}

	// Checkout new branch
	err = worktree.Checkout(branchOptions)
	if err != nil {
		gs.sendError(w, fmt.Sprintf("Failed to create branch: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": fmt.Sprintf("Branch '%s' created successfully", req.Name),
		"branch":  req.Name,
	})
}

// Switch branch endpoint
func (gs *GitService) switchBranchHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]
	branchName := vars["branchName"]

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	worktree, err := repo.Worktree()
	if err != nil {
		gs.sendError(w, "Failed to get worktree", http.StatusInternalServerError)
		return
	}

	// Checkout branch
	err = worktree.Checkout(&git.CheckoutOptions{
		Branch: plumbing.ReferenceName("refs/heads/" + branchName),
	})
	if err != nil {
		gs.sendError(w, fmt.Sprintf("Failed to switch branch: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": fmt.Sprintf("Switched to branch '%s'", branchName),
		"branch":  branchName,
	})
}

// Get commit history endpoint
func (gs *GitService) historyHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectID := vars["projectId"]

	// Parse query parameters
	limitStr := r.URL.Query().Get("limit")
	limit := 50 // default
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	repo, err := gs.openRepository(projectID)
	if err != nil {
		gs.sendError(w, "Repository not found", http.StatusNotFound)
		return
	}

	commits, err := gs.getCommitHistory(repo, limit)
	if err != nil {
		gs.sendError(w, "Failed to get commit history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"commits": commits,
	})
}

// Helper methods

func (gs *GitService) getRepositoryInfo(repo *git.Repository, projectID string) (*Repository, error) {
	head, err := repo.Head()
	if err != nil {
		return nil, err
	}

	commit, err := repo.CommitObject(head.Hash())
	if err != nil {
		return nil, err
	}

	// Get remote URL
	remotes, err := repo.Remotes()
	var url string
	if err == nil && len(remotes) > 0 {
		urls := remotes[0].Config().URLs
		if len(urls) > 0 {
			url = urls[0]
		}
	}

	// Get current branch name
	branchName := strings.TrimPrefix(head.Name().String(), "refs/heads/")

	// Get repository status
	status, err := gs.getRepositoryStatus(repo)
	if err != nil {
		return nil, err
	}

	return &Repository{
		ID:     projectID,
		Name:   filepath.Base(url),
		URL:    url,
		Branch: branchName,
		LastCommit: &Commit{
			Hash:    commit.Hash.String(),
			Message: commit.Message,
			Author: Author{
				Name:  commit.Author.Name,
				Email: commit.Author.Email,
			},
			Date: commit.Author.When,
		},
		Status:    status,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}

func (gs *GitService) getRepositoryStatus(repo *git.Repository) (*Status, error) {
	worktree, err := repo.Worktree()
	if err != nil {
		return nil, err
	}

	status, err := worktree.Status()
	if err != nil {
		return nil, err
	}

	var stagedFiles, modifiedFiles, untrackedFiles []string

	for file, fileStatus := range status {
		switch fileStatus.Staging {
		case git.Added, git.Modified, git.Deleted:
			stagedFiles = append(stagedFiles, file)
		}

		switch fileStatus.Worktree {
		case git.Modified, git.Deleted:
			modifiedFiles = append(modifiedFiles, file)
		case git.Untracked:
			untrackedFiles = append(untrackedFiles, file)
		}
	}

	return &Status{
		Clean:          status.IsClean(),
		StagedFiles:    stagedFiles,
		ModifiedFiles:  modifiedFiles,
		UntrackedFiles: untrackedFiles,
		Ahead:          0, // TODO: Calculate ahead/behind
		Behind:         0,
	}, nil
}

func (gs *GitService) getBranches(repo *git.Repository) ([]*Branch, error) {
	refs, err := repo.References()
	if err != nil {
		return nil, err
	}

	head, err := repo.Head()
	if err != nil {
		return nil, err
	}

	currentBranch := strings.TrimPrefix(head.Name().String(), "refs/heads/")
	var branches []*Branch

	err = refs.ForEach(func(ref *plumbing.Reference) error {
		if ref.Name().IsBranch() {
			branchName := strings.TrimPrefix(ref.Name().String(), "refs/heads/")
			
			commit, err := repo.CommitObject(ref.Hash())
			if err != nil {
				return err
			}

			branch := &Branch{
				Name:     branchName,
				IsActive: branchName == currentBranch,
				LastCommit: &Commit{
					Hash:    commit.Hash.String(),
					Message: commit.Message,
					Author: Author{
						Name:  commit.Author.Name,
						Email: commit.Author.Email,
					},
					Date: commit.Author.When,
				},
				Ahead:  0, // TODO: Calculate ahead/behind
				Behind: 0,
			}

			branches = append(branches, branch)
		}
		return nil
	})

	return branches, err
}

func (gs *GitService) getCommitHistory(repo *git.Repository, limit int) ([]*Commit, error) {
	head, err := repo.Head()
	if err != nil {
		return nil, err
	}

	commitIter, err := repo.Log(&git.LogOptions{
		From: head.Hash(),
	})
	if err != nil {
		return nil, err
	}
	defer commitIter.Close()

	var commits []*Commit
	count := 0

	err = commitIter.ForEach(func(commit *object.Commit) error {
		if count >= limit {
			return fmt.Errorf("limit reached")
		}

		commits = append(commits, &Commit{
			Hash:    commit.Hash.String(),
			Message: commit.Message,
			Author: Author{
				Name:  commit.Author.Name,
				Email: commit.Author.Email,
			},
			Date: commit.Author.When,
		})

		count++
		return nil
	})

	if err != nil && err.Error() != "limit reached" {
		return nil, err
	}

	return commits, nil
}

func (gs *GitService) sendError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	errorResp := ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
		Code:    statusCode,
	}
	
	json.NewEncoder(w).Encode(errorResp)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8005"
	}

	workspaceDir := os.Getenv("WORKSPACE_DIR")
	if workspaceDir == "" {
		workspaceDir = "/tmp/neoai-workspaces"
	}

	// Ensure workspace directory exists
	if err := os.MkdirAll(workspaceDir, 0755); err != nil {
		log.Fatalf("Failed to create workspace directory: %v", err)
	}

	gitService := NewGitService(workspaceDir)

	// Create router
	r := mux.NewRouter()

	// Health check
	r.HandleFunc("/health", gitService.healthHandler).Methods("GET")

	// Git operations
	r.HandleFunc("/git/clone", gitService.cloneHandler).Methods("POST")
	r.HandleFunc("/git/{projectId}/status", gitService.statusHandler).Methods("GET")
	r.HandleFunc("/git/{projectId}/info", gitService.infoHandler).Methods("GET")
	r.HandleFunc("/git/{projectId}/commit", gitService.commitHandler).Methods("POST")
	r.HandleFunc("/git/{projectId}/push", gitService.pushHandler).Methods("POST")
	r.HandleFunc("/git/{projectId}/branches", gitService.branchesHandler).Methods("GET")
	r.HandleFunc("/git/{projectId}/branches", gitService.createBranchHandler).Methods("POST")
	r.HandleFunc("/git/{projectId}/branches/{branchName}/checkout", gitService.switchBranchHandler).Methods("POST")
	r.HandleFunc("/git/{projectId}/history", gitService.historyHandler).Methods("GET")

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)

	log.Printf("🚀 Git Service starting on port %s", port)
	log.Printf("📁 Workspace directory: %s", workspaceDir)
	
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
