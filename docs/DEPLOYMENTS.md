# Controlled MONIFlow deployments

MONIFlow uses **GitHub for code and CI** and **Vercel for intentional production releases**.

## Automatic builds are disabled

The existing Vercel projects remain connected to `realxpen/moniflow`:

| Target | Existing Vercel project | Source |
| --- | --- | --- |
| Web | `moniflow` | `apps/mobile` |
| API | `moniflow-api` | `apps/api` |

Both application `vercel.json` files set `git.deploymentEnabled: false`. New commits and pull requests do **not** automatically deploy either project. `.github/workflows/ci.yml` still validates each push to `main` and pull request.

Vercel may need to process the commit that introduces `git.deploymentEnabled` once before automatic Git deployment suppression takes effect. Verify the next code-only commit does not deploy.

## One-time GitHub secret setup

1. In Vercel, create a scoped Access Token for the **Swifna Technology Limited** team.
2. In GitHub open `realxpen/moniflow` > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
3. Set the name to **`VERCEL_TOKEN`** and paste the token value there. Never commit the token, paste it into chat, or put it in `EXPO_PUBLIC_*`.

The known **team ID** and two **existing project IDs** are non-secret and already configured in the workflow. No extra GitHub secrets are required. The Actions token must be authorized for both existing Vercel projects.

## Publish only at a release checkpoint

1. Open **Actions > Deploy MONIFlow to Vercel**.
2. Choose **Run workflow** on **`main`**.
3. Choose `both`, `api`, or `web`.
4. The workflow typechecks, exports the web bundle and tests first.
5. Only after those checks pass does it build and deploy using the Vercel CLI. For `both`, API is deployed before web.

`workflow_dispatch` is the only trigger. Normal commits never launch the release workflow. Only use `both` when both need to change.

The workflow uses `vercel pull`, `vercel build --prod`, and `vercel deploy --prebuilt --prod` so builds are performed in GitHub Actions, not again on Vercel.

## Boundaries

- This only changes deployment frequency; it does not change financial-provider behavior.
- Existing production deployments stay live until the next deliberate release.
- A passing GitHub Actions build does not prove BMONI real-device signing or real sandbox settlement.
- GitHub must have the `VERCEL_TOKEN` secret before the first manual release. The token is never stored in the source repo.
- If a project has an unexpected Root Directory configuration in Vercel, confirm it points to its matching app folder before manually deploying.
