# Downgrade your `yarn.lock` to v1

## Purpose

Not intended to be used daily, because Yarn V2 is great.

However, we are always fearful when upgrading something important.
With `yarn-lock-v1` you can say "don't worry, we can always go back to Yarn V1 if something goes wrong".

## Usage

```
$ npx yarn-lock-v1
```

`yarn-lock-v1` automatically generates a back up if the destination (`yarn.lock` by default) already exists.

You can specify a different input or a different output.

```
$ npx yarn-lock-v1 -f yarn.lock.v2 -o yarn.lock.v1
```

`yarn-lock-v1` also sees your `.yarnrc.yml` for credentials if necessary. You can specify a different location for the rc.

```
$ npx yarn-lock-v1 -c ../somewhere/.yarnrc.yml
```
