import axios, { AxiosResponse } from 'axios';
import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';

import type { User } from '../../../../../shared/types';
import { axiosInstance, getJWTHeader } from '../../../axiosInstance';
import { queryKeys } from '../../../react-query/constants';
import {
  clearStoredUser,
  getStoredUser,
  setStoredUser,
} from '../../../user-storage';

interface AxiosResponseWithCancel extends AxiosResponse {
  cancel: () => void;
}
async function getUser(user: User | null): Promise<AxiosResponseWithCancel> {
  const source = axios.CancelToken.source();

  if (!user) return null;
  const axiosResponse: AxiosResponseWithCancel = await axiosInstance.get(
    `/user/${user.id}`,
    {
      headers: getJWTHeader(user),
      cancelToken: source.token,
    },
  );
  axiosResponse.cancel = () => {
    source.cancel();
  };

  return axiosResponse;
}

interface UseUser {
  user: User | null;
  updateUser: (user: User) => void;
  clearUser: () => void;
}

export function useUser(): UseUser {
  const [user, setuser] = useState<User | null>(getStoredUser());
  const queryClient = useQueryClient();

  useQuery(queryKeys.user, () => getUser(user), {
    enabled: !!user,
    onSuccess: (axiosResponse) => setuser(axiosResponse?.data?.user),
  });

  // meant to be called from useAuth
  function updateUser(newUser: User): void {
    // set user in state
    setuser(newUser);

    // set user in local storage
    setStoredUser(newUser);

    // pre-populate user profile in react query client
    queryClient.setQueryData(queryKeys.user, newUser);
  }

  // meant to be called from useAuth
  function clearUser() {
    // update state
    setuser(null);

    // remove from local storage
    clearStoredUser();

    // reset user to null in query client
    queryClient.setQueryData(queryKeys.user, null);

    // remove user appointments query
    queryClient.removeQueries([queryKeys.appointments, queryKeys.user]);
  }

  return { user, updateUser, clearUser };
}
