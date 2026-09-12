
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

### Step 4: Configure Workflow Permissions on GitHub
To allow GitHub Actions to bump SemVer versions, create Git tags, and publish GitHub Releases, verify that workflow permissions are set properly:

1. Go to your GitHub repository.
2. Navigate to: **Settings** > **Actions** > **General**.
3. Scroll down to **Workflow permissions**.
4. Select **Read and write permissions**.
5. Click **Save**.

---

### Step 5: Understand Conventional Commits and Semantic Versioning
The workflow automatically calculates the next version tag based on [Conventional Commits](https://www.conventionalcommits.org/):

| Commit Message Prefix | Release Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `fix:` / `fix(...):` | **PATCH** | `fix: fix audio playback on safari` | Bug fixes or minor corrections (e.g., `v1.0.0` $\rightarrow$ `v1.0.1`). |
| `feat:` / `feat(...):` | **MINOR** | `feat: add new animals topic` | New features or functional additions (e.g., `v1.0.0` $\rightarrow$ `v1.1.0`). |
| `BREAKING CHANGE:` or `feat!:` / `fix!:` | **MAJOR** | `feat!: restructure entire media API` | Incompatible breaking changes (e.g., `v1.0.0` $\rightarrow$ `v2.0.0`). |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:` | **PATCH** (default) | `docs: update deployment documentation` | Maintenance, documentation, and code refactor tasks. |

---

### Step 6: Create the GitHub Actions Workflow File
Ensure the workflow configuration file exists in your repository at `.github/workflows/deploy.yml`:

```yaml
name: Auto Release and Deploy to VPS

# Trigger workflow on push to main branch
on:
  push:
    branches:
      - main

jobs:
  # Job 1: Calculate SemVer tag, push git tag, and create GitHub Release with changelog
  release:
    name: Create Semantic Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
    outputs:
      new_tag: ${{ steps.tag_version.outputs.new_tag }}
      release_type: ${{ steps.tag_version.outputs.release_type }}
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Calculate Next SemVer Tag
        id: tag_version
        uses: mathieudutour/github-tag-action@v6.2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          default_bump: patch
          tag_prefix: v
          fetch_all_tags: true
          create_annotated_tag: false

      - name: Synchronize Version into package.json Files
        if: steps.tag_version.outputs.new_tag != ''
        run: |
          NEW_VER="${{ steps.tag_version.outputs.new_version }}"
          NEW_TAG="${{ steps.tag_version.outputs.new_tag }}"
          echo "Updating packages to version: $NEW_VER ($NEW_TAG)"

          # Update version in root, backend, and frontend package.json
          npm version "$NEW_VER" --no-git-tag-version
          npm --prefix backend version "$NEW_VER" --no-git-tag-version
          npm --prefix frontend version "$NEW_VER" --no-git-tag-version

          # Configure Git author
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Commit updated package manifests
          git add package.json backend/package.json frontend/package.json
          git commit -m "chore(release): bump version to $NEW_VER [skip ci]"

          # Push commit back to main branch
          git push origin HEAD:main

          # Point release tag to the bumped version commit and push tag
          git tag -fa "$NEW_TAG" -m "Release $NEW_TAG"
          git push origin "$NEW_TAG" --force

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        if: steps.tag_version.outputs.new_tag != ''
        with:
          tag_name: ${{ steps.tag_version.outputs.new_tag }}
          name: Release ${{ steps.tag_version.outputs.new_tag }}
          body: ${{ steps.tag_version.outputs.changelog }}
          generate_release_notes: false

  # Job 2: Deploy to VPS via SSH after release job finishes successfully
  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: release
    if: success()
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
            echo "=========================================="
            echo "Starting deployment for release: ${{ needs.release.outputs.new_tag }}"
            echo "=========================================="

            # 1. Navigate to the project directory on VPS
            cd /opt/kids-flashcard-app

            # 2. Add safe.directory configuration for Git (avoid Git security error)
            git config --global --add safe.directory /opt/kids-flashcard-app

            # 3. Fetch latest tags and commits
            git fetch --tags origin

            # 4. Make deploy.sh executable and execute
            chmod +x deploy.sh
            ./deploy.sh

            # 5. Display current git status and commit details
            echo "=========================================="
            echo "Deployment finished successfully!"
            echo "Deployed Tag: ${{ needs.release.outputs.new_tag }}"
            echo "Latest Commit Information:"
            git log -1 --oneline
            echo "=========================================="
```

---

### Step 7: Verification & Operation
1. When changes are merged or pushed to the `main` branch, the workflow will trigger automatically.
2. In your GitHub repository, switch to the **Actions** tab to observe the execution:
   - **Job 1 (`release`)**: Inspects commit messages, bumps version tag according to SemVer, creates git tag, and generates GitHub Release with release notes.
   - **Job 2 (`deploy`)**: Triggers only when `release` succeeds, connects to VPS via SSH, pulls updates, executes `./deploy.sh`, and prints release tag and commit information.
3. Check the **Releases** tab on GitHub to see the generated release and changelog notes.
