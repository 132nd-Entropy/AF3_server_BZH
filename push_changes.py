from git import Repo

# Define the local repository path and remote repository URL
local_repo_path = "/home/entropy/AF3_server_BZH"  # Replace with the path to the updated files
remote_repo_url = "https://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@github.com/132nd-Entropy/AF3_server_BZH.git"  # Replace <your_token> with your GitHub token

# Initialize the repository and set the remote URL
repo = Repo(local_repo_path)
if 'origin' not in [remote.name for remote in repo.remotes]:
    repo.create_remote('origin', remote_repo_url)
else:
    repo.remotes.origin.set_url(remote_repo_url)

# Stage, commit, and push changes
repo.git.add(all=True)
repo.index.commit("Updated app.js to use UUID for job IDs")
repo.remotes.origin.push(refspec='HEAD:main')  # Push changes to the main branch
print("Changes pushed successfully!")
