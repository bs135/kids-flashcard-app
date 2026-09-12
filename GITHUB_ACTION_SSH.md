
# GitHub Actions and SSH Deployment Guide

### Step 1: Generate a Dedicated SSH Key Pair for Deployment
You should generate a dedicated SSH key pair (separate from your personal keys) for enhanced security.

1. **Access your VPS or open a local terminal, and run:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -C "github-actions-deploy"
   ```
   *When prompted for a passphrase, press **Enter** to leave it empty (no passphrase).*

2. This command generates 2 files in the `~/.ssh/` directory:
   * `github_deploy_key` (**Private Key** - keep strictly confidential).
   * `github_deploy_key.pub` (**Public Key** - configured on the VPS).

---

### Step 2: Configure the Public Key on the VPS
Authorize access for anyone authenticating with the Private Key generated in Step 1.

1. Log into your VPS as root or a sudo user.
2. Open the `authorized_keys` file for editing:
   ```bash
   nano ~/.ssh/authorized_keys
   ```
3. Copy the entire contents of the Public Key file (`github_deploy_key.pub` created in Step 1) and paste it at the end of `authorized_keys`.
4. Save and exit (`Ctrl + O` -> `Enter` to save, `Ctrl + X` to exit).
5. Set the proper SSH directory permissions to prevent key authentication issues:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

---

### Step 3: Configure Repository Secrets on GitHub
Store connection credentials safely in GitHub Secrets so the workflow can connect without exposing sensitive credentials in source code.

1. Go to your GitHub repository.
2. Navigate to: **Settings** > **Secrets and variables** > **Actions** > Click **New repository secret**.
3. Add the following 3 secrets:
   * **Name:** `SSH_HOST`  
     **Value:** Public IP address of the VPS (e.g., `123.45.67.89`).
   * **Name:** `SSH_USERNAME`  
     **Value:** Deployment user on the VPS (e.g., `root` or `ubuntu`).
   * **Name:** `SSH_PRIVATE_KEY`  
     **Value:** Full content of the Private Key file (`github_deploy_key` from Step 1 - including the starting `-----BEGIN OPENSSH PRIVATE KEY-----` and ending `-----END OPENSSH PRIVATE KEY-----` lines).

---

### Step 4: Create the GitHub Actions Workflow File
Ensure the workflow configuration file exists in your repository.

1. In the repository root, create the directory `.github/workflows/` (if it doesn't already exist).
2. Create or verify `deploy.yml` with the following content:

```yaml
name: Auto Deploy to VPS

# Trigger workflow on push to main branch
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: 22
          script: |
            # 1. Navigate to the project directory on VPS
            cd /opt/kids-flashcard-app
            
            # 2. Mark project directory as safe for Git
            git config --global --add safe.directory /opt/kids-flashcard-app
            
            # 3. Execute deploy.sh
            chmod +x deploy.sh
            ./deploy.sh
```

### Step 5: Verification & Operation
1. Commit and push the `.github/workflows/deploy.yml` file to the `main` branch.
2. In your GitHub repository, switch to the **Actions** tab; you will see the `Auto Deploy to VPS` workflow running.
3. Once the workflow completes (marked with a green checkmark ✅), pulling the latest code, rebuilding Docker containers, and pruning old images on your VPS will be completely automated!
