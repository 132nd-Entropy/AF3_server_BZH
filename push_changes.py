from git import Repo

# Define the local repository path and remote repository URL
local_repo_path = "/home/entropy/AF3_server_BZH"  # Replace with the path to the updated files
remote_repo_url = "https://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@github.com/132nd-Entropy/AF3_server_BZH.git"  # Replace <your_token> with your GitHub token

repo = Repo(local_repo_path)

# Set up the remote URL
if 'origin' not in [remote.name for remote in repo.remotes]:
    repo.create_remote('origin', remote_repo_url)
else:
    repo.remotes.origin.set_url(remote_repo_url)

# Fetch and merge changes from the remote branch
repo.remotes.origin.fetch()
repo.git.pull('origin', 'main')

# Stage, commit, and push changes
repo.git.add(all=True)
repo.index.commit("Updated app.js to use UUID for job IDs")
repo.remotes.origin.push(refspec='HEAD:main')
print("Changes pushed successfully!")
